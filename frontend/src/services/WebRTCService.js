class WebRTCService {
    constructor() {
        this.peerConnections = new Map();
        this.localStream = null;
        this.stompClient = null;
        this.roomCode = null;
        this.currentUserId = null;
        this.onRemoteStream = null;
        this.onParticipantLeft = null;

        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
    }

    initialize(stompClient, roomCode, userId, localStream) {
        this.stompClient = stompClient;
        this.roomCode = roomCode;
        this.currentUserId = userId;
        this.localStream = localStream;

        // Subscribe to WebRTC signaling messages
        this.stompClient.subscribe(`/topic/signal/${roomCode}`, (message) => {
            this.handleSignalingMessage(JSON.parse(message.body));
        });
    }

    async createPeerConnection(participantId) {
        if (this.peerConnections.has(participantId)) {
            return this.peerConnections.get(participantId);
        }

        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(participantId, peerConnection);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle incoming stream
        peerConnection.ontrack = (event) => {
            console.log('Received remote track from:', participantId);
            if (this.onRemoteStream) {
                this.onRemoteStream(participantId, event.streams[0]);
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    from: this.currentUserId,
                    to: participantId
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${participantId}:`, peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                this.closePeerConnection(participantId);
            }
        };

        return peerConnection;
    }

    async createOffer(participantId) {
        const peerConnection = await this.createPeerConnection(participantId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        this.sendSignalingMessage({
            type: 'offer',
            offer: offer,
            from: this.currentUserId,
            to: participantId
        });
    }

    async handleSignalingMessage(message) {
        const { type, from, to, offer, answer, candidate } = message;

        // Ignore messages not meant for us
        if (to && to !== this.currentUserId) {
            return;
        }

        // Don't process our own messages
        if (from === this.currentUserId) {
            return;
        }

        try {
            switch (type) {
                case 'offer':
                    await this.handleOffer(from, offer);
                    break;
                case 'answer':
                    await this.handleAnswer(from, answer);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(from, candidate);
                    break;
                case 'participant-left':
                    this.handleParticipantLeft(from);
                    break;
                default:
                    console.log('Unknown signaling message type:', type);
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    async handleOffer(participantId, offer) {
        const peerConnection = await this.createPeerConnection(participantId);
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        this.sendSignalingMessage({
            type: 'answer',
            answer: answer,
            from: this.currentUserId,
            to: participantId
        });
    }

    async handleAnswer(participantId, answer) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async handleIceCandidate(participantId, candidate) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }

    handleParticipantLeft(participantId) {
        this.closePeerConnection(participantId);
        if (this.onParticipantLeft) {
            this.onParticipantLeft(participantId);
        }
    }

    sendSignalingMessage(message) {
        if (this.stompClient && this.stompClient.connected) {
            this.stompClient.publish({
                destination: `/app/signal/${this.roomCode}`,
                body: JSON.stringify(message)
            });
        }
    }

    notifyJoin() {
        this.sendSignalingMessage({
            type: 'join',
            from: this.currentUserId
        });
    }

    notifyLeave() {
        this.sendSignalingMessage({
            type: 'participant-left',
            from: this.currentUserId
        });
    }

    updateLocalStream(newStream) {
        this.localStream = newStream;

        // Update all peer connections with new tracks
        this.peerConnections.forEach((peerConnection, participantId) => {
            const senders = peerConnection.getSenders();
            const newTracks = newStream.getTracks();

            senders.forEach(sender => {
                const newTrack = newTracks.find(track => track.kind === sender.track?.kind);
                if (newTrack) {
                    sender.replaceTrack(newTrack);
                }
            });
        });
    }

    toggleTrack(kind, enabled) {
        if (this.localStream) {
            const tracks = kind === 'video'
                ? this.localStream.getVideoTracks()
                : this.localStream.getAudioTracks();

            tracks.forEach(track => {
                track.enabled = enabled;
            });
        }
    }

    closePeerConnection(participantId) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(participantId);
        }
    }

    cleanup() {
        this.notifyLeave();

        this.peerConnections.forEach((pc, id) => {
            pc.close();
        });
        this.peerConnections.clear();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.stompClient = null;
        this.roomCode = null;
        this.currentUserId = null;
    }
}

export default new WebRTCService();