import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import {
  getUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
  setActiveUserController,
  restoreUserController,
} from './users.controller.js';

export const usersRouter: Router = Router();

usersRouter.use(requireAuth, requireRole('OWNER', 'SUPERADMIN'));

usersRouter.get('/', getUsersController);
usersRouter.get('/:id', getUserByIdController);
usersRouter.post('/', createUserController);
usersRouter.patch('/:id', updateUserController);
usersRouter.delete('/:id', deleteUserController);
usersRouter.post('/:id/restore', restoreUserController);
usersRouter.patch('/:id/deactivate', setActiveUserController(false));
usersRouter.patch('/:id/activate', setActiveUserController(true));

