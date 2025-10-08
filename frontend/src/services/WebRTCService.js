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
        this.subscriptions = []; // Track subscriptions for cleanup
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
        this.currentUserId = String(userId);
        this.localStream = localStream;

        console.log('[WebRTC] Initializing for user:', this.currentUserId, 'in room:', roomCode);

        const roomSub = this.stompClient.subscribe(`/topic/signal/${roomCode}`, (message) => {
            console.log('[WebRTC] 📨 Received room-wide message');
            this.handleSignalingMessage(JSON.parse(message.body));
        });
        this.subscriptions.push(roomSub);

        const personalSub = this.stompClient.subscribe(`/topic/signal/${roomCode}/${this.currentUserId}`, (message) => {
            console.log('[WebRTC] 📬 Received personal message');
            this.handleSignalingMessage(JSON.parse(message.body));
        });
        this.subscriptions.push(personalSub);

        console.log('[WebRTC] ✅ Subscribed to room-wide and personal topics');
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

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('[WebRTC] Adding local track to PC:', track.kind, 'enabled:', track.enabled);
                peerConnection.addTrack(track, this.localStream);
            });
        }

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
        const { type, from, to } = message;
        const fromStr = String(from);
        const toStr = to ? String(to) : null;

        // Ignore messages from self
        if (fromStr === this.currentUserId) {
            console.log('[WebRTC] 🔄 Ignoring message from self:', type);
            return;
        }

        // For targeted messages, check if it's for me
        if (toStr && toStr !== this.currentUserId) {
            console.log('[WebRTC] 🚫 Message not for me, ignoring. From:', fromStr, 'To:', toStr);
            return;
        }

        console.log('[WebRTC] 📨 Processing signaling:', type, 'from:', fromStr, 'to:', toStr || 'broadcast');

        try {
            switch (type) {
                case 'join':
                    console.log('[WebRTC] 🎯 Handling join from:', fromStr);
                    await this.handleJoin(fromStr);
                    break;
                case 'offer':
                    console.log('[WebRTC] 📥 Handling offer from:', fromStr);
                    await this.handleOffer(fromStr, message.offer);
                    break;
                case 'answer':
                    console.log('[WebRTC] 📥 Handling answer from:', fromStr);
                    await this.handleAnswer(fromStr, message.answer);
                    break;
                case 'ice-candidate':
                    console.log('[WebRTC] 🧊 Handling ICE candidate from:', fromStr);
                    await this.handleIceCandidate(fromStr, message.candidate);
                    break;
                case 'leave':
                case 'participant-left':
                    console.log('[WebRTC] 👋 Participant left:', fromStr);
                    this.handleParticipantLeft(fromStr);
                    break;
                default:
                    console.warn('[WebRTC] ⚠️ Unknown message type:', type);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling signaling message:', error, 'Message:', message);
        }
    }

    async handleJoin(participantId) {
        const participantIdStr = String(participantId);
        console.log('[WebRTC] 👋 PARTICIPANT JOINED - Processing:', participantIdStr, 'Current user:', this.currentUserId);

        if (participantIdStr === this.currentUserId) {
            console.log('[WebRTC] 🔄 Ignoring own join message');
            return;
        }

        if (this.existingParticipants.has(participantIdStr)) {
            console.log('[WebRTC] ⚠️ Participant already exists:', participantIdStr);
            return;
        }

        this.existingParticipants.add(participantIdStr);
        console.log('[WebRTC] ✅ Added to existing participants:', participantIdStr);

        try {
            await this.createPeerConnection(participantIdStr);
            console.log('[WebRTC] ✅ Peer connection created for:', participantIdStr);
        } catch (error) {
            console.error('[WebRTC] ❌ Failed to create peer connection for:', participantIdStr, error);
            return;
        }

        const shouldInitiate = this.shouldInitiateConnection(this.currentUserId, participantIdStr);
        console.log('[WebRTC] 🤔 Should I initiate connection?', shouldInitiate,
            'My ID:', this.currentUserId, 'Their ID:', participantIdStr);

        if (shouldInitiate) {
            console.log('[WebRTC] 🎯 I will create offer to:', participantIdStr);
            setTimeout(async () => {
                try {
                    console.log('[WebRTC] 🚀 Creating offer to:', participantIdStr);
                    await this.createOffer(participantIdStr);
                } catch (error) {
                    console.error('[WebRTC] ❌ Failed to create offer to:', participantIdStr, error);
                }
            }, 1500);
        } else {
            console.log('[WebRTC] ⏳ Waiting for offer from:', participantIdStr);
        }
    }

    shouldInitiateConnection(userId1, userId2) {
        const id1 = String(userId1);
        const id2 = String(userId2);
        const shouldInitiate = id1 < id2;
        console.log('[WebRTC] 🎯 Connection initiation check:', id1, '<', id2, '=', shouldInitiate);
        return shouldInitiate;
    }

    async handleOffer(participantId, offer) {
        try {
            const participantIdStr = String(participantId);
            console.log('[WebRTC] 📥 Handling offer from:', participantIdStr);

            this.existingParticipants.add(participantIdStr);

            if (this.peerConnections.has(participantIdStr)) {
                console.log('[WebRTC] ⚠️ Already have connection, closing old one');
                this.closePeerConnection(participantIdStr);
            }

            const peerConnection = await this.createPeerConnection(participantIdStr);

            console.log('[WebRTC] 🔧 Setting remote description from offer');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] ✅ Remote description set from offer');

            if (this.pendingCandidates.has(participantIdStr)) {
                const candidates = this.pendingCandidates.get(participantIdStr);
                console.log('[WebRTC] 🔌 Adding', candidates.length, 'pending candidates');
                for (const candidate of candidates) {
                    try {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error('[WebRTC] ❌ Error adding pending candidate:', e);
                    }
                }
                this.pendingCandidates.delete(participantIdStr);
            }

            console.log('[WebRTC] 📤 Creating answer');
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            console.log('[WebRTC] ✅ Answer created and set as local description');

            this.sendSignalingMessage({
                type: 'answer',
                answer: answer,
                from: this.currentUserId,
                to: participantIdStr
            });

            console.log('[WebRTC] 📨 Answer sent to:', participantIdStr);
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling offer:', error);
        }
    }

    async handleAnswer(participantId, answer) {
        try {
            const participantIdStr = String(participantId);
            console.log('[WebRTC] 📥 Handling answer from:', participantIdStr);
            const peerConnection = this.peerConnections.get(participantIdStr);

            if (peerConnection) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                console.log('[WebRTC] ✅ Remote description set from answer');

                if (this.pendingCandidates.has(participantIdStr)) {
                    const candidates = this.pendingCandidates.get(participantIdStr);
                    console.log('[WebRTC] 🔌 Adding', candidates.length, 'pending candidates');
                    for (const candidate of candidates) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    this.pendingCandidates.delete(participantIdStr);
                }
            } else {
                console.error('[WebRTC] ❌ No peer connection found for:', participantIdStr);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling answer:', error);
        }
    }

    async handleIceCandidate(participantId, candidate) {
        try {
            const participantIdStr = String(participantId);
            const peerConnection = this.peerConnections.get(participantIdStr);

            if (peerConnection && peerConnection.remoteDescription) {
                console.log('[WebRTC] 🔌 Adding ICE candidate from:', participantIdStr);
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.log('[WebRTC] 💾 Storing pending ICE candidate from:', participantIdStr);
                if (!this.pendingCandidates.has(participantIdStr)) {
                    this.pendingCandidates.set(participantIdStr, []);
                }
                this.pendingCandidates.get(participantIdStr).push(candidate);
            }
        } catch (error) {
            console.error('[WebRTC] ❌ Error handling ICE candidate:', error);
        }
    }

    handleParticipantLeft(participantId) {
        const participantIdStr = String(participantId);
        console.log('[WebRTC] 👋 Participant left:', participantIdStr);
        this.closePeerConnection(participantIdStr);
        this.pendingCandidates.delete(participantIdStr);
        this.existingParticipants.delete(participantIdStr);
        this.initiatedConnections.delete(participantIdStr);
        if (this.onParticipantLeft) {
            this.onParticipantLeft(participantIdStr);
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
        console.log('[WebRTC] 📣 Notifying join to room:', this.roomCode, 'as user:', this.currentUserId);

        if (this.stompClient && this.roomCode) {
            const joinMessage = {
                type: 'join',
                from: this.currentUserId,
                roomCode: this.roomCode,
                timestamp: new Date().toISOString()
            };

            this.stompClient.publish({
                destination: `/app/signal/${this.roomCode}`,
                body: JSON.stringify(joinMessage)
            });
            console.log('[WebRTC] ✅ Join notification sent');
        } else {
            console.error('[WebRTC] ❌ Cannot notify join - missing stompClient or roomCode');
        }
    }

    notifyLeave() {
        console.log('[WebRTC] 📢 Notifying leave for user:', this.currentUserId);
        this.sendSignalingMessage({
            type: 'leave',
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
        const participantIdStr = String(participantId);
        const peerConnection = this.peerConnections.get(participantIdStr);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(participantIdStr);
            console.log('[WebRTC] ❌ Closed peer connection with:', participantIdStr);
        }
    }

    cleanup() {
        console.log('[WebRTC] 🧹 Cleaning up WebRTC service');
        this.notifyLeave();
        this.subscriptions.forEach(sub => {
            try {
                sub.unsubscribe();
            } catch (e) {
                console.error('[WebRTC] Error unsubscribing:', e);
            }
        });
        this.subscriptions = [];

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