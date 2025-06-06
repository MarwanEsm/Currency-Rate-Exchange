import React, { useEffect } from "react";
import styles from "./Modal.module.scss"
import { useIsDesktop } from "../../../utils/service"
import classNames from "classnames";

const Modal = ({ isOpen, onClose, children }) => {

    const isDesktop = useIsDesktop()
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.keyCode === 27) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        } else {
            document.removeEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);

    const handleClose = () => {
        onClose();
    };

    const handleOverlayClick = (event) => {
        if (event.target === event.currentTarget) {
            onClose();
        }
    };

    return (
        <>
            {isOpen && (
                <div className={classNames(isDesktop ? styles.modal_overlay : styles.mobile)} onClick={handleOverlayClick}>
                    <div className={styles.modal}>
                        <button className={styles.close_btn} onClick={handleClose}>
                            &times;
                        </button>
                        <div className={styles.modal_content}>{children}</div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modal;
