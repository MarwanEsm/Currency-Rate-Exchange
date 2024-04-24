import React, { useState, useContext } from "react";
import Form from "react-bootstrap/Form";
import Button from "../../elements/button/Button";
import Popup from "reactjs-popup";
import "reactjs-popup/dist/index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import { AuthContext } from "../../../firebase/authContext";
import styles from "./SignUp.module.scss"

const SignUp = () => {
    const [open, setOpen] = useState(false);

    const closePopup = () => {
        setOpen(false);
    };

    const { register } = useContext(AuthContext);

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
    const handleRegister = (event) => {
        event.preventDefault();
        register(state);
        alert(
            "thank you for submitting your details, we've sent you a confirmation link to your E-mail"
        );
    };

    const openPopup = () => {
        setOpen(true);
    };

    const isInvalid =
        state.firstName === "" ||
        state.lastName === "" ||
        state.password === "" ||
        state.passwordConfirmation !== state.password ||
        state.country === "" ||
        state.city === "" ||
        state.zip === "" ||
        state.checked === false;

    return <div className={styles.container}>

        <Form>
            <div className={styles.formContainer}>

                <input
                    type="text"
                    placeholder="First Name"
                    name="firstName"
                    value={state.firstName}
                    onChange={changeInput}
                    autoComplete=""
                />

                <input
                    type="text"
                    placeholder="Last Name"
                    name="lastName"
                    value={state.lastName}
                    onChange={changeInput}
                    autoComplete=""
                />

                <input
                    type="email"
                    placeholder="Email"
                    name="email"
                    value={state.email}
                    onChange={changeInput}
                    autoComplete=""
                />

                <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={state.password}
                    onChange={changeInput}
                    autoComplete=""
                />

                <input
                    type="password"
                    placeholder="Confirm Password"
                    name="passwordConfirmation"
                    value={state.passwordConfirmation}
                    onChange={changeInput}
                    autoComplete=""
                />

                <input
                    onClick={makeItChecked}
                    defaultChecked={state.checked}
                    type="checkbox"
                />


                <span onClick={openPopup}>
                    Agree to terms and conditions
                    <Button
                        type="submit"
                        onClick={handleRegister}
                        disabled={isInvalid}
                    >
                        Register
                    </Button>
                </span>
            </div>
        </Form>

    </div>
}



export default SignUp;
