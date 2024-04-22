import React, { useState, useEffect } from "react";
import styles from "./DateAndTime.module.scss";

const CurrentDate = () => {
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
    const currentDate = new Date();
    const date = currentDate.getDate();
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    return <h2>{`${date} ${month} ${year}`}</h2>


};

const DateAndTime = () => {
    const [date, setDate] = useState(new Date());

    useEffect(() => {
        const timerID = setInterval(() => tick(), 1000);
        return () => clearInterval(timerID);
    }, []);

    const tick = () => {
        setDate(new Date());
    };

    return (
        <div className={styles.container}>
            <div>
                <div><CurrentDate /></div>
                <h2 className={styles.time}>{date.toLocaleTimeString()}</h2>
            </div>
        </div>
    );
};

export default DateAndTime;
