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

    return <h3>{`${date} ${month} ${year}`}</h3>


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
                <CurrentDate />
                <h3 className={styles.time}>{date.toLocaleTimeString()}</h3>
            </div>
        </div>
    );
};

export default DateAndTime;
