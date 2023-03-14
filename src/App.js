import React from 'react';
import './App.css';
import Publisher from './components/Publisher';
import Subscriber from './components/Subscriber';

import RobotClientLite from './libs/RobotClientLite';

function App() {
  const componentTypes = {
    PUBLISHER: "publisher",
    SUBSCRIBER: "subscriber"
  }
  const [currentComponent, setCurrentComponent] = React.useState(componentTypes.PUBLISHER)
  const [messages, setMessages] = React.useState([])
  const robotClient = RobotClientLite.getInstance()

  function addNewMessage(message) {
    setMessages([...messages, message])
  }

  // set up ros client
  robotClient.setUpPublishSubscribe(addNewMessage)

  return (
    <div className="App">
      <div className='nav'>
        <button onClick={() => setCurrentComponent(componentTypes.PUBLISHER)}>Toggle Publisher</button>
        <button onClick={() => setCurrentComponent(componentTypes.SUBSCRIBER)}>Toggle Subscriber</button>
      </div>
      {currentComponent === componentTypes.PUBLISHER && <Publisher publishMessage={robotClient.publishMessage} robotClient={robotClient} />}
      { currentComponent === componentTypes.SUBSCRIBER && <Subscriber messages={messages} />}
    </div>
  );
}

export default App;