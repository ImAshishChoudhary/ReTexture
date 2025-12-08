import { Router } from 'express';
import { authenticateJWT } from '../middleware/authenticate';
import { chatController } from '../controllers/canvas';

const router = Router();

// router.use(authenticateJWT);

router.post('/', chatController.processState);
export default router;