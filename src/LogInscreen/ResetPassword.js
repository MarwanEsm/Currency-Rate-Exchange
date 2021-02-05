import React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import "bootstrap/dist/css/bootstrap.min.css";

function ResetPassword() {
  return (
    <div style={divStyle}>
      <Form>
        <Form.Row>
          <Form.Group as={Col} controlId="formGridEmail">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" placeholder="Enter email" />
          </Form.Group>
        </Form.Row>

        <Button
          variant="warning"
          type="submit"
          style={buttonStyle}
          // onClick={submitDetails}
        >
          Reset Password
        </Button>
      </Form>
    </div>
  );
}


const buttonStyle = {
  marginTop: 35,
  fontFamily: "Helvetica",
  fontWeight: "bold",
  fontSize: 15,
};

const divStyle = {
  marginLeft: "5%",
  marginRight: "5%",
  marginTop: "10%",
  marginBottom: "15%",
};

export default ResetPassword;