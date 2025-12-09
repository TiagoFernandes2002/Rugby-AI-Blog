// frontend/src/api/client.js
import axios from "axios";

const API_BASE_URL = "http://18.201.234.29:4000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});
