export default function Subscriber ({messages}) {


    return (
        <div>
        SUBSCRIBER
        <ul>
        { messages.map((message, i) => <li key={i}>{message.data}</li>) }
        </ul>
        </div>
        )
}