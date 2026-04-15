import React, { useEffect } from "react";
import styles from "./Modal.module.scss";
import { useIsDesktop } from "@/utils/service";
import classNames from "classnames";

const Modal = ({ isOpen, onClose, children, title = "Dialog" }) => {

    const isDesktop = useIsDesktop();
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === "Escape") {
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

    useEffect(() => {
        if (!isOpen) return undefined;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

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
                    <div className={styles.modal} role="dialog" aria-modal="true" aria-label={title}>
                        <button type="button" className={styles.close_btn} onClick={handleClose} aria-label="Close dialog">
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
