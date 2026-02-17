export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';

export const API_ENDPOINTS = {
  PARSE: `${API_BASE_URL}/parse`,
  VALIDATE: `${API_BASE_URL}/validate`,
  ANALYZE: `${API_BASE_URL}/analyze`,
  REPORT: (id: string) => `${API_BASE_URL}/report/${id}`,
};
