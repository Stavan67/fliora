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
        this.existingParticipants = new Set();
        this.initiatedConnections = new Set();

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
        this.currentUserId = String(userId); // Ensure it's a string for comparison
        this.localStream = localStream;

        console.log('[WebRTC] Initializing for user:', this.currentUserId, 'in room:', roomCode);

        this.stompClient.subscribe(`/topic/signal/${roomCode}`, (message) => {
            this.handleSignalingMessage(JSON.parse(message.body));
        });
    }

    async createPeerConnection(participantId) {
        const participantIdStr = String(participantId);

        if (this.peerConnections.has(participantIdStr)) {
            console.log('[WebRTC] Reusing existing peer connection with:', participantIdStr);
            return this.peerConnections.get(participantIdStr);
        }

        console.log('[WebRTC] Creating NEW peer connection with:', participantIdStr);
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(participantIdStr, peerConnection);

        // Add local tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('[WebRTC] Adding local track to PC:', track.kind, 'enabled:', track.enabled);
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
            console.log('[WebRTC] 🎥 RECEIVED REMOTE TRACK from:', participantIdStr, 'kind:', event.track.kind);
            console.log('[WebRTC] Track details - readyState:', event.track.readyState, 'enabled:', event.track.enabled);
            console.log('[WebRTC] Streams received:', event.streams.length);

            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                console.log('[WebRTC] Stream tracks:', stream.getTracks().map(t => t.kind));

                if (this.onRemoteStream) {
                    console.log('[WebRTC] ✅ Calling onRemoteStream callback for:', participantIdStr);
                    this.onRemoteStream(participantIdStr, stream);
                } else {
                    console.error('[WebRTC] ❌ onRemoteStream callback is NULL!');
                }
            } else {
                console.error('[WebRTC] ❌ No stream in track event!');
            }
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] Sending ICE candidate to:', participantIdStr);
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    from: this.currentUserId,
                    to: participantIdStr
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state with', participantIdStr + ':', peerConnection.connectionState);
            if (peerConnection.connectionState === 'disconnected' ||
                peerConnection.connectionState === 'failed') {
                this.closePeerConnection(participantIdStr);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state with', participantIdStr + ':', peerConnection.iceConnectionState);
        };

        return peerConnection;
    }

    async createOffer(participantId) {
        const participantIdStr = String(participantId);

        try {
            console.log('[WebRTC] 📤 Creating offer for:', participantIdStr);
            const peerConnection = await this.createPeerConnection(participantIdStr);

            const offer = await peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await peerConnection.setLocalDescription(offer);
            console.log('[WebRTC] Offer created and set as local description');

            this.sendSignalingMessage({
                type: 'offer',
                offer: offer,
                from: this.currentUserId,
                to: participantIdStr
            });

            this.initiatedConnections.add(participantIdStr);
        } catch (error) {
            console.error('[WebRTC] ❌ Error creating offer:', error);
        }
    }

    async handleSignalingMessage(message) {
        const { type, from, to, offer, answer, candidate } = message;
        const fromStr = String(from);
        const toStr = to ? String(to) : null;

        // Ignore messages from ourselves
        if (fromStr === this.currentUserId) {
            return;
        }

        // For targeted messages, ignore if not meant for us
        if (toStr && toStr !== this.currentUserId) {
            return;
        }

        console.log('[WebRTC] 📨 Received signaling:', type, 'from:', fromStr);

        try {
            switch (type) {
                case 'join':
                    await this.handleJoin(fromStr);
                    break;
                case 'offer':
                    await this.handleOffer(fromStr, offer);
                    break;
                case 'answer':
                    await this.handleAnswer(fromStr, answer);
                    break;
                case 'ice-candidate':
                    await this.handleIceCandidate(fromStr, candidate);
                    break;
                case 'participant-left':
                    this.handleParticipantLeft(fromStr);
                    break;
                default:
                    console.log('[WebRTC] Unknown message type:', type);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling signaling message:', error);
        }
    }

    async handleJoin(participantId) {
        console.log('[WebRTC] 👋 Participant joined:', participantId);

        if (!this.peerConnections.has(participantId)) {
            this.existingParticipants.add(participantId);

            if (this.shouldInitiateConnection(this.currentUserId, participantId)) {
                console.log('[WebRTC] 🎯 I should initiate connection to:', participantId);
                setTimeout(() => {
                    this.createOffer(participantId);
                }, 100);
            } else {
                console.log('[WebRTC] ⏳ Waiting for', participantId, 'to initiate connection');
            }
        }
    }

    shouldInitiateConnection(myId, theirId) {
        return String(myId) < String(theirId);
    }

    async handleOffer(participantId, offer) {
        try {
            console.log('[WebRTC] 📥 Handling offer from:', participantId);

            this.existingParticipants.add(participantId);

            const peerConnection = await this.createPeerConnection(participantId);
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] Remote description set from offer');

            // Add any pending candidates
            if (this.pendingCandidates.has(participantId)) {
                const candidates = this.pendingCandidates.get(participantId);
                console.log('[WebRTC] Adding', candidates.length, 'pending candidates');
                for (const candidate of candidates) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                }
                this.pendingCandidates.delete(participantId);
            }

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log('[WebRTC] Answer created and set as local description');

            this.sendSignalingMessage({
                type: 'answer',
                answer: answer,
                from: this.currentUserId,
                to: participantId
            });
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling offer:', error);
        }
    }

    async handleAnswer(participantId, answer) {
        try {
            console.log('[WebRTC] 📥 Handling answer from:', participantId);
            const peerConnection = this.peerConnections.get(participantId);

            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('[WebRTC] Remote description set from answer');

                // Add any pending candidates
                if (this.pendingCandidates.has(participantId)) {
                    const candidates = this.pendingCandidates.get(participantId);
                    console.log('[WebRTC] Adding', candidates.length, 'pending candidates');
                    for (const candidate of candidates) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    this.pendingCandidates.delete(participantId);
                }
            } else {
                console.error('[WebRTC] ❌ No peer connection found for:', participantId);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling answer:', error);
        }
    }

    async handleIceCandidate(participantId, candidate) {
        try {
            const peerConnection = this.peerConnections.get(participantId);

            if (peerConnection && peerConnection.remoteDescription) {
                console.log('[WebRTC] Adding ICE candidate from:', participantId);
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.log('[WebRTC] Storing pending ICE candidate from:', participantId);
                if (!this.pendingCandidates.has(participantId)) {
                    this.pendingCandidates.set(participantId, []);
                }
                this.pendingCandidates.get(participantId).push(candidate);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling ICE candidate:', error);
        }
    }

    handleParticipantLeft(participantId) {
        console.log('[WebRTC] 👋 Participant left:', participantId);
        this.closePeerConnection(participantId);
        this.pendingCandidates.delete(participantId);
        this.existingParticipants.delete(participantId);
        this.initiatedConnections.delete(participantId);
        if (this.onParticipantLeft) {
            this.onParticipantLeft(participantId);
        }
    }

    sendSignalingMessage(message) {
        if (this.stompClient && this.stompClient.connected) {
            console.log('[WebRTC] 📤 Sending signaling message:', message.type, 'to:', message.to || 'room');
            this.stompClient.publish({
                destination: `/app/signal/${this.roomCode}`,
                body: JSON.stringify(message)
            });
        } else {
            console.error('[WebRTC] ❌ Cannot send signaling message: STOMP client not connected');
        }
    }

    notifyJoin() {
        console.log('[WebRTC] 📢 Notifying join for user:', this.currentUserId);
        this.sendSignalingMessage({
            type: 'join',
            from: this.currentUserId
        });
    }

    notifyLeave() {
        console.log('[WebRTC] 📢 Notifying leave for user:', this.currentUserId);
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
                console.log(`[WebRTC] ${kind} track ${enabled ? 'enabled' : 'disabled'}`);
            });
        }
    }

    closePeerConnection(participantId) {
        const peerConnection = this.peerConnections.get(participantId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(participantId);
            console.log('[WebRTC] ❌ Closed peer connection with:', participantId);
        }
    }

    cleanup() {
        console.log('[WebRTC] 🧹 Cleaning up WebRTC service');
        this.notifyLeave();

        this.peerConnections.forEach((pc, id) => {
            pc.close();
        });
        this.peerConnections.clear();
        this.pendingCandidates.clear();
        this.existingParticipants.clear();
        this.initiatedConnections.clear();

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