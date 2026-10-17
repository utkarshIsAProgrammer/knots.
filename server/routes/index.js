const auth = require('../middleware/auth');
const rateLimit = require('../middleware/rate-limit');
const contactRequestHandler = require('../handlers/contact-request');
const messageHandler = require('../handlers/message');
const x3dhHandler = require('../handlers/x3dh');
const registrationHandler = require('../handlers/registration');
const disappearingHandler = require('../handlers/disappearing');
const keyRotationHandler = require('../handlers/key-rotation');
const errorHandler = require('../middleware/error');

const router = require('express').Router();

// ===== Registration Routes (rate limited) =====
router.post('/register', rateLimit.endpoints.register, auth, registrationHandler);
router.post('/register/knot-id', rateLimit.endpoints.register, auth, registrationHandler.registerKnotId);

// ===== Contact Flow Routes =====
router.post('/contact-request', rateLimit.endpoints.contactRequest, auth, contactRequestHandler.sendContactRequest);
router.post('/contact-request/accept', auth, contactRequestHandler.acceptContactRequest);
router.post('/contact-request/reject', auth, contactRequestHandler.rejectContactRequest);
router.post('/contact-request/block', auth, contactRequestHandler.blockContact);

// ===== X3DH Handshake Routes =====
router.post('/x3dh-handshake', rateLimit.endpoints.x3dh, auth, x3dhHandler.initiateX3DH);
router.post('/x3dh-handshake/response', rateLimit.endpoints.x3dh, auth, x3dhHandler.handleX3DHResponse);

// ===== Messaging Routes =====
router.post('/message', rateLimit.endpoints.message, auth, messageHandler.sendMessage);
router.get('/message/:recipient', auth, messageHandler.getMessages);
router.put('/message/:id/read', auth, messageHandler.markRead);

// ===== Disappearing Messages =====
router.post('/message/disappearing', auth, disappearingHandler.setTTL);
router.get('/message/disappearing/status', auth, disappearingHandler.getStatus);

// ===== Key Rotation =====
router.post('/keys/rotate', auth, keyRotationHandler.rotateIdentityKey);
router.post('/keys/rotate/otp', auth, keyRotationHandler.rotateOneTimeKeys);
router.get('/keys/status', auth, keyRotationHandler.getKeyStatus);

// ===== Error handling (must be last) =====
router.use(errorHandler.handle);

module.exports = router;