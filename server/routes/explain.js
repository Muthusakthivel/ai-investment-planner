import { Router } from 'express';
import { explainAllocations } from '../controllers/explainController.js';

const router = Router();

router.post('/', explainAllocations);

export default router;
