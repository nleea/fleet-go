import axios from 'axios'
import type { AxiosInstance } from 'axios'

const axiosClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para manejar errores de red
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!navigator.onLine) {
      console.warn('[AXIOS] Sin conexión - operación no enviada')
    }
    return Promise.reject(error)
  }
)

export default axiosClient