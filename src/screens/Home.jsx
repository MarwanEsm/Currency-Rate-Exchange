import React from "react";
import Header from "../components/layout/header/Header";
import Logo from "../components/elements/Logo/Logo";
// import LoginButton from "./LoginButton";
// import RegistrationLink from "./RegistrationLink";
// import LandingScreenStyle from "../Style/LandingScreenStyle";
import Button from "../components/elements/button/Button"
import Link from "../components/elements/link/Link";
import Container from "../components/layout/container/Container";
const Home = () => {
    return (
        <div>
            <div>
                <Container></Container>
            </div>
            <div style={divStyle}>
                <Header />
                <Logo />
                <Button>Log in</Button>
                <Link />

            </div>
        </div >
    );
}
const divStyle = {
    position: "relative",
};

export default Home;
