import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api/* 는 Vercel 서버리스 함수가 처리합니다.
// 로컬에서 실제 서버리스까지 띄우려면 `vercel dev` 를 사용하세요.
// 그냥 `npm run dev` 로 띄우면 /api 응답이 없으므로 앱이 자동으로
// 샘플 데이터 + 시뮬레이션 경로(폴백)로 동작합니다.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})
