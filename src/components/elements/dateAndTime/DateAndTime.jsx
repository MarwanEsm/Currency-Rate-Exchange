import React, { useState, useEffect } from "react";
import styles from "./DateAndTime.module.scss";

const CurrentDate = ({ date }) => {
    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    if (!date) return <h4 suppressHydrationWarning>&nbsp;</h4>;
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return <h4 suppressHydrationWarning>{`${day} ${month} ${year}`}</h4>;
};

const DateAndTime = () => {
    const [date, setDate] = useState(() => new Date());

    useEffect(() => {
        const timerID = setInterval(() => {
            setDate(new Date());
        }, 1000);
        return () => clearInterval(timerID);
    }, []);

    return (
        <div className={styles.container}>
            <CurrentDate date={date} />
            <h4 suppressHydrationWarning className={styles.time}>
                {date ? date.toLocaleTimeString() : "\u00A0"}
            </h4>
        </div>
    );
};

export default DateAndTime;
