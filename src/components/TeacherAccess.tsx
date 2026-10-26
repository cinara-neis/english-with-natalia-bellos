import { api, base, localEditing, repoUrl } from "../lib";
import * as S from "../styles";
export default function TeacherAccess() {
  const address = `${window.location.origin}${base}#/admin`;
  return (
    <S.Panel aria-labelledby="teacher-access-heading">
      <h2 id="teacher-access-heading">Teacher access</h2>
      <p>
        Open the blog, choose <strong>Teacher login</strong> in the top menu,
        then manage students, documents, learning progress and journal posts
        here.
      </p>
      <label htmlFor="teacher-address">
        Address for this blog’s teacher panel
      </label>
      <input
        id="teacher-address"
        readOnly
        value={address}
        onFocus={(e) => e.target.select()}
        aria-describedby="teacher-address-help"
      />
      <p id="teacher-address-help">
        {localEditing
          ? "This address works only on this computer and requires the teacher password. It is not an online address for another computer."
          : api
            ? "Sign in with the authorised GitHub account to save changes."
            : "Online sign-in is not configured yet. The site owner needs to configure the GitHub App and authentication service."}
      </p>
      {repoUrl ? (
        <S.Button
          as="a"
          $secondary
          href={repoUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open blog repository (opens in a new tab)
        </S.Button>
      ) : (
        <S.Notice>
          No GitHub repository is configured yet. Add the repository owner and
          name before sharing an online editing link.
        </S.Notice>
      )}
    </S.Panel>
  );
}
