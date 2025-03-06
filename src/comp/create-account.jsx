export default function CreateAccount({ handleCreateAccount }) {
  return (
    <fieldset className="login">
      <legend>
        <h1>Create Account</h1>
      </legend>
      <form onSubmit={handleCreateAccount} className="form">
        <p>
          Password:
          <input
            type="password"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Enter password..."
            name="password"
            autoFocus
            className="input"
          />
        </p>
        <p id="error" className="error"></p>
        <button type="submit" className="button">
          Create Account
        </button>
      </form>
    </fieldset>
  );
}
