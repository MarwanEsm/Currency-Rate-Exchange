import React, { Component } from "react";

class DateAndTime extends Component {
  constructor(props) {
    super(props);
    this.state = { date: new Date() };
  }

  componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.timerID);
  }

  tick() {
    this.setState({
      date: new Date(),
    });
  }

  render() {
    return (
      <div>
        <h1 style={h1Style}>Welcome Back</h1>
        <ShowCurrentDate />
        <h2 style={h2Style}>{this.state.date.toLocaleTimeString()}</h2>
      </div>
    );
  }
}

function ShowCurrentDate() {
  const date = new Date().getDate();
  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();
  const currentDate = date + "-" + month + "-" + year;

  return (
    <div>
      <h2 style={h2Style}>{currentDate.toLocaleString()}</h2>
    </div>
  );
}

const h1Style = {
  fontFamily: "Fantasy ",
  fontSize: '1rem',
  paddingTop: 20,
};

const h2Style = {
  fontFamily: "Apple Color Emoji ",
  fontSize: 20,
  fontWeight: "bold",
};

export default DateAndTime;
