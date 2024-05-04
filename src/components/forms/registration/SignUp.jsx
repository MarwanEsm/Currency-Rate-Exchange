import React, { useState } from "react";
import Button from "../../elements/button/Button";
import styles from "./SignUp.module.scss"
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";


const SignUp = ({ onRegistration }) => {


    const [state, setState] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        passwordConfirmation: "",
        country: "",
        city: "",
        zip: "",
        checked: false,
    });

    const changeInput = (event) => {
        const value = event.target.value;
        event.preventDefault();

        setState({
            ...state,
            [event.target.name]: value,
        });
    };

    const makeItChecked = () => {
        setState({ ...state, checked: !state.checked });
    };



    const isInvalid =
        state.firstName === "" ||
        state.lastName === "" ||
        state.password === "" ||
        state.passwordConfirmation !== state.password ||
        state.checked === false;

    return <div className={styles.container}>

        <form onSubmit={() => onRegistration(state)} method="POST">
            <div className={styles.formContainer} >
                <input
                    type="text"
                    placeholder="First Name"
                    name="firstName"
                    value={state.firstName}
                    onChange={changeInput}
                    autoComplete="off"
                />

                <input
                    type="text"
                    placeholder="Last Name"
                    name="lastName"
                    value={state.lastName}
                    onChange={changeInput}
                    autoComplete="off"
                />

                <input
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={state.email}
                    onChange={changeInput}
                    autoComplete="off"
                />

                <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={state.password}
                    onChange={changeInput}
                    autoComplete="off"
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    name="passwordConfirmation"
                    value={state.passwordConfirmation}
                    onChange={changeInput}
                    autoComplete="off"
                />

                <span>
                    <input
                        onClick={makeItChecked}
                        defaultChecked={state.checked}
                        type="checkbox"
                    />
                    Agree to terms and conditions
                </span>

                <Button type="submit" disabled={isInvalid}>
                    Register
                </Button>

            </div>
        </form>

    </div>
}



export default SignUp;
