# Knots: Anonymous End-to-End Encrypted Chat

*Portfolio-grade software development lifecycle document demonstrating applied cryptography, backend systems design, and security engineering.*

## Executive Summary

### Project Overview

**Knots** is a server-blind, end-to-end encrypted, anonymous chat web application. Users identify each other through unique secret codes called "Knot IDs." The server never has access to plaintext messages, user identities, or personally identifiable information (PII). The goal is a feature-rich chat app that is practically anonymous, safe, and stores only the minimum data necessary — so that even if the database is breached, no user is harmed.

### Vision & Goals

| Goal | Description | Success Metric |
|------|-------------|----------------|
| **Server-blind architecture** | Server stores only hashed Knot IDs, public keys, contact request state, and encrypted message blobs with TTL | Even under database breach, no PII or plaintext messages exposed |
| **End-to-end encryption** | All messages encrypted with X3DH + Double Ratchet protocol | Forward secrecy guaranteed; compromise of long-term keys doesn't reveal past messages |
| **Practical anonymity** | No PII collected; Knot IDs derived from BIP39 mnemonics or base58 public keys | User can operate without revealing identity; resistant to deanonymization |
| **Free-tier sustainable** | Run on services requiring no credit card | 1,000-2,000 active users on free tier without card |
| **Portfolio-quality** | Demonstrate applied cryptography, systems design, security engineering | Document serves as credible portfolio piece |

### Target Audience

- Privacy maximalists and cypherpunks
- Journalists and activists in repressive environments
- Security researchers and crypto-native users
- Technically capable privacy-conscious individuals

### Non-Goals (v1)

- Voice/video calls
- Multi-device sync
- Contact discovery/search
- Social features (feeds, profiles, followers)
- Mainstream consumer scale
- Email/SMS signup
- Push notifications
- Cloud backups

### Success Metrics (MVP)

- 100+ registered users within first month
- Messages can be sent and received E2EE via Ably
- Offline message delivery via MongoDB TTL queue
- Key rotation and contact blocking functional
- No credit card required for deployment
- Documented threat model and architecture