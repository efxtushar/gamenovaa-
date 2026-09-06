import React from 'react';
import { ChooseUsernameModal } from './ChooseUsernameModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot';
  onAuthSuccess?: (username: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  return (
    <ChooseUsernameModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onAuthSuccess}
    />
  );
};
