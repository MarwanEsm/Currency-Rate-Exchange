import React from "react";
import styles from "./OrderProgressTimeline.module.scss";

/**
 * @param {{ steps: ReadonlyArray<{ statusKey: string, title: string, description: string, variant: string }> }} props
 */
const OrderProgressTimeline = ({ steps }) => {
    return (
        <ol className={styles.timeline} aria-label="Order progress">
            {steps.map((step) => (
                <li
                    key={step.statusKey}
                    className={styles.item}
                    data-variant={step.variant}
                >
                    <span className={styles.marker} aria-hidden="true" />
                    <div className={styles.body}>
                        <span className={styles.title}>{step.title}</span>
                        <p className={styles.description}>{step.description}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
};

export default OrderProgressTimeline;
