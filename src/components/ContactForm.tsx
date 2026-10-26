import { useState } from "react";
import * as S from "../styles";

export default function ContactForm({ email }: { email: string }) {
  const [name, setName] = useState("");
  const [reply, setReply] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState(false);
  const configured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const example = email.endsWith("@example.com");
  return <form onSubmit={(event) => {
    event.preventDefault();
    if (!configured || example) return;
    const query = new URLSearchParams({ view: "cm", fs: "1", to: email, su: subject,
      body: `Name: ${name}\nReply email: ${reply}\n\n${message}` });
    window.open(`https://mail.google.com/mail/?${query}`, "_blank", "noopener,noreferrer");
    setPrepared(true);
  }}>
    <h2>Send a message</h2>
    {example && <S.Notice>Example contact: {email}. Replace it with the teacher’s real Gmail in the admin panel to enable sending.</S.Notice>}
    {!configured && <S.Notice>The teacher’s email is being configured. Sending is not available yet.</S.Notice>}
    <label htmlFor="contact-name">Your name</label>
    <input id="contact-name" autoComplete="name" required maxLength={100} value={name} onChange={e => setName(e.target.value)} />
    <label htmlFor="contact-email">Your email</label>
    <input id="contact-email" type="email" autoComplete="email" required maxLength={200} value={reply} onChange={e => setReply(e.target.value)} />
    <label htmlFor="contact-subject">Subject</label>
    <input id="contact-subject" required maxLength={150} value={subject} onChange={e => setSubject(e.target.value)} />
    <label htmlFor="contact-message">Message</label>
    <textarea id="contact-message" required maxLength={1500} rows={6} value={message} onChange={e => setMessage(e.target.value)} />
    <p id="contact-help"><small>This opens a draft in Gmail in a new tab. Sign in to your Gmail account, review it and press Send there. This form does not send automatically.</small></p>
    <S.Button type="submit" disabled={!configured || example} aria-describedby="contact-help">Open message in Gmail</S.Button>
    {prepared && <S.Notice role="status">Your draft was prepared. If a tab opened, complete the send in Gmail. If it was blocked, allow the new tab and try again. Nothing has been sent by this form.</S.Notice>}
  </form>;
}
