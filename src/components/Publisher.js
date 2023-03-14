import React from "react"


export default function Publisher ({ publishMessage, robotClient }) {

    return (<div>
        Publisher
        <button onClick={() => robotClient.publishMessage()}>Publish</button>
    </div>)
}