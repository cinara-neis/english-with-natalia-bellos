import styled, { createGlobalStyle, css } from "styled-components";
import palette from "../shared/appearance.json";
import type { Student } from "../shared/content";
export const SkipLink = styled.a`
  position: fixed;
  top: 8px;
  left: 8px;
  transform: translateY(-200%);
  z-index: 100;
  padding: 12px 18px;
  background: #293b36;
  color: #fff;
  border-radius: 6px;
  &:focus {
    transform: translateY(0);
  }
`;
export const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;
export const Global = createGlobalStyle`
*{box-sizing:border-box}body{margin:0;color:#293b36;background:#faf9f5;font-family:Arial,Helvetica,sans-serif;font-size: 0.9375rem;line-height:1.6}button,input,select,textarea{font:inherit}button,a,input,select,textarea{outline-offset:4px}button,a{touch-action:manipulation}button{cursor:pointer}a{color:inherit}h1,h2,h3,p{margin-top:0}h1,h2,h3{line-height:1.15}h1,h2{font-family:Georgia,serif;font-weight:normal}h1{font-size:clamp(2.25rem,4vw,3.5625rem);letter-spacing:-1.8px}h2{font-size: 1.875rem}h3{font-size: 1.0625rem}button:disabled{opacity:.55;cursor:wait}input,select,textarea{width:100%;border:1px solid #7a876d;border-radius:9px;padding:11px;background:white;color:#293b36}textarea{min-height:110px;resize:vertical}label{display:block;font-weight:600;font-size: 0.875rem;margin:15px 0 6px}small{color:#65756b}svg{vertical-align:middle}::selection{background:#dbe5c4}a:focus-visible,button:focus-visible{outline:3px solid #9a603a}

html { font-size: 100%; }
html[data-large-text="true"] { font-size: 125%; }
body { font-size: 1rem; }
button, input, select { min-height: 44px; }
button, a { -webkit-tap-highlight-color: transparent; }
header nav a, aside > a, article footer a { min-height: 44px; display: inline-flex; align-items: center; }
button { min-width: 44px; }
input, select, textarea { border-color: #718066; }
input::placeholder, textarea::placeholder { color: #56634e; opacity: 1; }
:focus-visible { outline: 3px solid #85461b; outline-offset: 4px; }
main:focus, dialog h2:focus { outline-offset: -3px; }
button[aria-pressed="true"] { box-shadow: inset 0 0 0 2px currentColor; }
pre { overflow-wrap: anywhere; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
body { min-width: 0; }
fieldset { min-inline-size: 0; max-inline-size: 100%; }
input, select, textarea { min-inline-size: 0; max-inline-size: 100%; font-size: 1rem; }
input[type="file"] { overflow: hidden; }
input[type="file"]::file-selector-button { min-height: 44px; max-width: 100%; white-space: normal; }
img, video, iframe { max-inline-size: 100%; }
button, a { overflow-wrap: anywhere; }
button svg, a svg { flex-shrink: 0; }
summary { min-height: 44px; cursor: pointer; padding: 10px 0; font-weight: bold; }
@media (max-width: 36rem) { h1 { font-size: 2rem; letter-spacing: -0.04em; } h2 { font-size: 1.6rem; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
html[data-high-contrast="true"] body,
html[data-high-contrast="true"] body * { background-color: #000 !important; color: #fff !important; border-color: #fff !important; }
html[data-high-contrast="true"] a { color: #ffff00 !important; text-decoration: underline !important; }
html[data-high-contrast="true"] :focus-visible { outline-color: #ffff00 !important; }
html[data-high-contrast="true"] button[aria-pressed="true"] { background-color: #ffff00 !important; color: #000 !important; }
html[data-high-contrast="true"] input::placeholder { color: #fff !important; }
html[data-high-contrast="true"] progress { accent-color: #ffff00 !important; }
@media (forced-colors: active) { button, input, select, textarea, dialog { border: 2px solid ButtonText; } :focus-visible { outline: 3px solid Highlight; } }
`;
export const Shell = styled.div`
  overflow-wrap: anywhere;
  min-width: 0;
  display: grid;
  grid-template-columns: clamp(15rem, 22vw, 18rem) minmax(0, 1fr);
  min-height: 100vh;
  > * {
    min-width: 0;
  }
  @media (max-width: 62rem) {
    grid-template-columns: 1fr;
  }
`;
export const Side = styled.aside`
  background: #eef1e7;
  border-right: 1px solid #dfe4d7;
  padding: 38px 24px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  @media (max-width: 62rem) {
    padding: 16px clamp(16px, 4vw, 32px);
    gap: 12px;
    border-right: 0;
    border-bottom: 1px solid #dfe4d7;
  }
`;
export const Brand = styled.div`
  text-align: center;
  img {
    width: 130px;
    height: 130px;
  }
  .blog-name {
    font-family: Georgia, serif;
    font-size: 1.6875rem;
    margin: 15px 0 10px;
  }
  p {
    font-size: 0.875rem;
    color: #526147;
    margin: 0;
  }
  @media (max-width: 62rem) {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    column-gap: 14px;
    text-align: left;
    align-items: center;
    img {
      width: 64px;
      height: 64px;
      grid-row: 1 / 3;
    }
    .blog-name {
      margin: 0;
      font-size: 1.35rem;
    }
    p:last-child {
      font-size: 0.75rem;
      letter-spacing: 0.04em;
    }
  }
`;
export const StudentNavigation = styled.details`
  min-width: 0;
  summary {
    display: none;
  }
  @media (max-width: 62rem) {
    summary {
      display: list-item;
      margin-left: 1rem;
    }
    &[open] summary {
      margin-bottom: 12px;
    }
  }
`;
export const SideLabel = styled.p`
  font-size: 0.875rem;
  letter-spacing: 2px;
  font-weight: bold;
  color: #526147;
  margin: 0 10px 12px;
`;
export const Students = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  @media (max-width: 62rem) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr));
    padding-bottom: 6px;
  }
`;
export const StudentButton = styled.button<{ $active?: boolean }>`
  min-width: 0;
  width: 100%;
  border: 0;
  text-align: left;
  background: ${(p) => (p.$active ? "#dce6ce" : "transparent")};
  color: #354635;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  gap: 11px;
  align-items: center;
  white-space: normal;
  font-weight: ${(p) => (p.$active ? "bold" : "normal")};
  &:hover {
    background: #dfe7d5;
  }
  span:first-child {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border-radius: 50%;
    height: 32px;
    width: 32px;
    background: #fafaf5;
    color: #6c795d;
    font-size: 0.875rem;
  }
  span:last-child:not(:first-child) {
    margin-left: auto;
  }
`;
export const TeacherNote = styled.div`
  margin-top: auto;
  border-top: 1px solid #d6ddce;
  padding: 24px 8px 0;
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 1.125rem;
  color: #526147;
  small {
    font: 0.875rem Arial;
    display: block;
    margin-top: 10px;
    letter-spacing: 1px;
  }
  @media (max-width: 62rem) {
    display: none;
  }
`;
export const Header = styled.header`
  min-height: 88px;
  flex-wrap: wrap;
  border-bottom: 1px solid #e9e9df;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px clamp(16px, 4vw, 48px);
  gap: 15px;
  nav {
    display: flex;
    gap: 8px 24px;
    flex-wrap: wrap;
    min-width: 0;
  }
  a {
    gap: 6px;
    text-decoration: none;
    font-size: 0.875rem;
  }
  a[aria-current="page"] {
    font-weight: bold;
    color: #537043;
  }
  @media (max-width: 36rem) {
    align-items: flex-start;
    gap: 8px;
    nav {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 12px;
      width: 100%;
    }
  }
`;
export const Main = styled.main<{ $appearance?: Student["appearance"] }>`
  ${(p) =>
    p.$appearance &&
    css`
      background: ${palette.backgrounds[p.$appearance.background].background};
      color: ${palette.backgrounds[p.$appearance.background].text};
      font-family: ${palette.fonts[p.$appearance.font].css};
      h1,
      h2,
      h3 {
        font-family: inherit;
      }
    `}
  min-width: 0;
  width: 100%;
  padding: clamp(24px, 4vw, 45px) clamp(16px, 4vw, 48px) 20px;
  max-width: 1350px;
  margin: auto;
  @media (max-width: 550px) {
    padding: 24px 16px;
  }
`;
export const Eyebrow = styled.p`
  font-size: 0.875rem;
  letter-spacing: 2px;
  font-weight: bold;
  text-transform: uppercase;
  color: #526147;
  margin-bottom: 14px;
`;
export const Hero = styled.section`
  background: #f0eddf;
  border: 1px solid #e7e2d2;
  border-radius: 18px;
  padding: clamp(20px, 3vw, 36px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  position: relative;
  overflow: hidden;
  margin-bottom: 38px;
  > div {
    min-width: 0;
  }
  > svg {
    flex-shrink: 0;
    width: clamp(120px, 16vw, 205px);
  }
  h1 {
    margin: 12px 0 15px;
  }
  p {
    max-width: 470px;
    color: #526147;
    margin-bottom: 0;
  }
  @media (max-width: 600px) {
    padding: 20px;
    > svg {
      display: none;
    }
  }
`;
export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  min-width: 0;
  > * {
    min-width: 0;
    max-width: 100%;
  }
`;
export const SaveBar = styled(Row)`
  position: sticky;
  top: 0;
  z-index: 5;
  background: #faf9f5;
  padding: 12px 0;
  border-bottom: 1px solid #718066;
  @media (max-width: 36rem), (max-height: 30rem) {
    position: static;
  }
`;
export const AccessibilityToolbar = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  > * {
    min-width: 0;
  }
  @media (max-width: 36rem) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    > strong,
    > button:last-child {
      grid-column: 1 / -1;
    }
    > button {
      width: 100%;
    }
  }
`;
export const Chip = styled.span`
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 20px;
  font-size: 0.875rem;
  background: #e6ecd9;
  color: #596c43;
`;
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 19px;
`;
export const Card = styled.article`
  min-width: 0;
  background: #fff;
  border: 1px solid #e4e6dc;
  border-radius: 14px;
  padding: clamp(16px, 2vw, 24px);
  display: flex;
  flex-direction: column;
  gap: 15px;
  h3 {
    font-family: Georgia, serif;
    font-size: 1.4375rem;
    font-weight: normal;
    margin: 0;
  }
  p {
    color: #526147;
    margin: 0;
    font-size: 0.875rem;
  }
  footer {
    border-top: 1px solid #edf0e8;
    padding-top: 14px;
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    margin-top: auto;
    align-items: center;
  }
  time {
    font-size: 0.875rem;
    color: #526147;
  }
  button,
  a {
    font-size: 0.875rem;
  }
`;
export const IconBox = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 44px;
  border-radius: 10px;
  background: ${(p) => p.$color || "#edf1e7"};
  color: #6a795b;
`;
export const Button = styled.button<{ $secondary?: boolean }>`
  min-width: 0;
  max-width: 100%;
  white-space: normal;
  text-align: center;
  border: 1px solid ${(p) => (p.$secondary ? "#d5ddcc" : "#536d42")};
  border-radius: 8px;
  background: ${(p) => (p.$secondary ? "#fff" : "#536d42")};
  color: ${(p) => (p.$secondary ? "#46573d" : "#fff")};
  padding: 10px 17px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  text-decoration: none;
  &:hover:not(:disabled) {
    filter: brightness(0.95);
  }
`;
export const LinkButton = styled.button`
  background: none;
  border: 0;
  padding: 0;
  color: #536d42;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
`;
export const Panel = styled.section`
  min-width: 0;
  width: 100%;
  border: 1px solid #e0e5d8;
  border-radius: 14px;
  padding: clamp(16px, 3vw, 28px);
  background: white;
  margin-bottom: 24px;
  max-width: 850px;
`;
export const Notice = styled.div<{ $error?: boolean }>`
  background: ${(p) => (p.$error ? "#fff0eb" : "#eef2e7")};
  color: ${(p) => (p.$error ? "#9b392a" : "#526548")};
  border: 1px solid ${(p) => (p.$error ? "#e7c9bf" : "#dce5cd")};
  padding: 14px 18px;
  border-radius: 9px;
  margin: 15px 0;
  white-space: pre-wrap;
  font-size: 0.875rem;
`;
export const Footer = styled.footer`
  border-top: 1px solid #e4e7dc;
  padding: 25px 0;
  margin-top: 42px;
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #526147;
  gap: 20px;
  flex-wrap: wrap;
  > * {
    min-width: 0;
  }
  @media (max-width: 36rem) {
    flex-direction: column;
    gap: 8px;
  }
`;
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: #25342c99;
  z-index: 20;
  padding: 25px;
  display: grid;
  place-items: center;
`;
export const Dialog = styled.dialog`
  margin: auto;
  border: 1px solid #7a876d;
  &::backdrop {
    background: #18251dcc;
  }
  background: #fafbf7;
  border-radius: 16px;
  width: min(950px, calc(100% - 16px));
  max-width: calc(100% - 16px);
  max-height: calc(100vh - 16px);
  max-height: calc(100dvh - 16px);
  overflow: auto;
  padding: clamp(16px, 3vw, 24px);
  iframe {
    width: 100%;
    height: 65vh;
    height: 65dvh;
    border: 1px solid #ddd;
  }
  img {
    max-width: 100%;
    max-height: 65vh;
    max-height: 65dvh;
    height: auto;
    object-fit: contain;
    display: block;
    margin: auto;
  }
  pre {
    white-space: pre-wrap;
    font: 1rem/1.8 Arial;
  }
`;
