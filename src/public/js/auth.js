(() => {
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await nativeFetch(input, init);
    const requestUrl = input instanceof Request ? input.url : String(input);
    const pathname = new URL(requestUrl, window.location.href).pathname;

    // Login needs to display the contract's generic credential error inline.
    if (response.status === 401 && pathname !== "/api/auth/login") {
      window.location.assign("/login");
    }

    return response;
  };
})();
