import React from 'react';
import './NotificationPopup.css'; // O CSS que vamos atualizar

function NotificationPopup({ config, onClose }) {
  if (!config.isOpen) {
    return null;
  }

  const { message, type, onConfirm } = config;

  // Define o título e a cor com base no tipo
  // (Removemos a variável 'icon')
  let title = "Sucesso!";
  let titleClass = "title-success";

  if (type === 'error') {
    title = "Erro!";
    titleClass = "title-error";
  } else if (type === 'confirm') {
    title = "Confirmação";
    titleClass = "title-confirm";
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="notification-backdrop">
      <div className="notification-content">
        
        {/* 🎯 MUDANÇA AQUI: Trocamos o emoji por animações de CSS */}
        <div className="icon-container">
          {type === 'success' && (
            <div className="icon-success">
              {/* Este é o "V" do checkmark */}
            </div>
          )}
          {type === 'error' && (
            <div className="icon-error">
              {/* Este é o "X" do erro */}
              <span className="x-line x-line-1"></span>
              <span className="x-line x-line-2"></span>
            </div>
          )}
          {type === 'confirm' && (
            <div className="icon-confirm">
              {/* Este é o "!" da confirmação */}
              <span className="excl-line"></span>
              <span className="excl-dot"></span>
            </div>
          )}
        </div>
        
        <h3 className={`notification-title ${titleClass}`}>{title}</h3>
        <p className="notification-message">{message}</p>
        
        <div className="notification-actions">
          {type === 'confirm' ? (
            <>
              <button 
                className="btn-notification btn-cancel" 
                onClick={onClose}
              >
                Não
              </button>
              <button 
                className="btn-notification btn-confirm" 
                onClick={handleConfirm}
              >
                Sim
              </button>
            </>
          ) : (
            <button 
              className="btn-notification btn-ok" 
              onClick={onClose}
            >
              OK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPopup;