import { Router } from 'express';
import { createPlan } from '../controllers/planController.js';

const router = Router();

router.post('/', createPlan);

export default router;
