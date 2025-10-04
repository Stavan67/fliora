class WebRTCService {
    constructor() {
        this.peerConnections = new Map();
        this.localStream = null;
        this.stompClient = null;
        this.roomCode = null;
        this.currentUserId = null;
        this.onRemoteStream = null;
        this.onParticipantLeft = null;
        this.pendingCandidates = new Map();
        this.existingParticipants = new Set(); // Track who we've already connected to

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

        this.stompClient.subscribe(`/topic/signal/${roomCode}`, (message) => {
            this.handleSignalingMessage(JSON.parse(message.body));
        });

        console.log('WebRTC initialized for user:', userId);
    }

    async createPeerConnection(participantId) {
        if (this.peerConnections.has(participantId)) {
            return this.peerConnections.get(participantId);
        }

        console.log('Creating peer connection with:', participantId);
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(participantId, peerConnection);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track to peer connection:', track.kind, track.enabled);
                peerConnection.addTrack(track, this.localStream);
            });
        }

        peerConnection.ontrack = (event) => {
            console.log('Received remote track from:', participantId, event.track.kind);
            if (this.onRemoteStream && event.streams[0]) {
                this.onRemoteStream(participantId, event.streams[0]);
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to:', participantId);
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    from: this.currentUserId,
                    to: participantId
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${participantId}:`, peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                this.closePeerConnection(participantId);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${participantId}:`, peerConnection.iceConnectionState);
        };

        return peerConnection;
    }

    async createOffer(participantId) {
        try {
            console.log('Creating offer for:', participantId);
            const peerConnection = await this.createPeerConnection(participantId);
            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await peerConnection.setLocalDescription(offer);

            this.sendSignalingMessage({
                type: 'offer',
                offer: offer,
                from: this.currentUserId,
                to: participantId
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    async handleSignalingMessage(message) {
        const { type, from, to, offer, answer, candidate } = message;

        // Ignore messages from ourselves
        if (from === this.currentUserId) {
            return;
        }

        // For targeted messages, ignore if not meant for us
        if (to && to !== this.currentUserId) {
            return;
        }

        console.log('Handling signaling message:', type, 'from:', from);

        try {
            switch (type) {
                case 'join':
                    // CRITICAL FIX: When someone joins, ALL existing participants should initiate connection
                    // Only create offer if we haven't already connected to this participant
                    if (!this.peerConnections.has(from) && !this.existingParticipants.has(from)) {
                        console.log('New participant joined, initiating connection:', from);
                        this.existingParticipants.add(from);
                        // Add a small delay to avoid race conditions
                        setTimeout(() => {
                            this.createOffer(from);
                        }, 100);
                    }
                    break;
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
        try {
            console.log('Handling offer from:', participantId);

            // Mark this participant as existing
            this.existingParticipants.add(participantId);

            const peerConnection = await this.createPeerConnection(participantId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

            // Add any pending candidates
            if (this.pendingCandidates.has(participantId)) {
                console.log('Adding pending candidates for:', participantId);
                const candidates = this.pendingCandidates.get(participantId);
                for (const candidate of candidates) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
                this.pendingCandidates.delete(participantId);
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            this.sendSignalingMessage({
                type: 'answer',
                answer: answer,
                from: this.currentUserId,
                to: participantId
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    async handleAnswer(participantId, answer) {
        try {
            console.log('Handling answer from:', participantId);
            const peerConnection = this.peerConnections.get(participantId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

                // Add any pending candidates
                if (this.pendingCandidates.has(participantId)) {
                    console.log('Adding pending candidates for:', participantId);
                    const candidates = this.pendingCandidates.get(participantId);
                    for (const candidate of candidates) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    this.pendingCandidates.delete(participantId);
                }
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    async handleIceCandidate(participantId, candidate) {
        try {
            const peerConnection = this.peerConnections.get(participantId);
            if (peerConnection && peerConnection.remoteDescription) {
                console.log('Adding ICE candidate from:', participantId);
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                // Store candidate for later if we don't have remote description yet
                console.log('Storing pending ICE candidate from:', participantId);
                if (!this.pendingCandidates.has(participantId)) {
                    this.pendingCandidates.set(participantId, []);
                }
                this.pendingCandidates.get(participantId).push(candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    handleParticipantLeft(participantId) {
        console.log('Participant left:', participantId);
        this.closePeerConnection(participantId);
        this.pendingCandidates.delete(participantId);
        this.existingParticipants.delete(participantId);
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
        } else {
            console.error('Cannot send signaling message: STOMP client not connected');
        }
    }

    notifyJoin() {
        console.log('Notifying join for user:', this.currentUserId);
        this.sendSignalingMessage({
            type: 'join',
            from: this.currentUserId
        });
    }

    notifyLeave() {
        console.log('Notifying leave for user:', this.currentUserId);
        this.sendSignalingMessage({
            type: 'participant-left',
            from: this.currentUserId
        });
    }

    updateLocalStream(newStream) {
        this.localStream = newStream;

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
                console.log(`${kind} track ${enabled ? 'enabled' : 'disabled'}`);
            });
        }
    }

    closePeerConnection(participantId) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(participantId);
            console.log('Closed peer connection with:', participantId);
        }
    }

    cleanup() {
        console.log('Cleaning up WebRTC service');
        this.notifyLeave();

        this.peerConnections.forEach((pc, id) => {
            pc.close();
        });
        this.peerConnections.clear();
        this.pendingCandidates.clear();
        this.existingParticipants.clear();

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