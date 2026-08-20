import axios from "axios";

/**
 * Same-origin API client.
 *
 * Requests go to this app's own /api routes, which proxy to FastAPI on the
 * server. That keeps the backend location out of the bundle entirely, so no
 * rebuild is needed when the deployment moves — and there is no CORS to
 * configure, because the browser never leaves the origin.
 */
const api = axios.create({
    baseURL: "/api",
    headers: {
        "Content-Type": "application/json",
    },
});

export default api;
