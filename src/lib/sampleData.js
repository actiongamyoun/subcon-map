// GAS(구글시트) 미연결 시 사용하는 데모 데이터.
// 좌표는 부산권 실제 위치 부근. *_en은 영어 모드용(없으면 한글 폴백).
// items[].prj = 소속 호선(프로젝트) id, ''이면 공통(모든 호선 표시).
import { DEFAULT_YARD } from './constants.js'

export const SAMPLE = {
  yard: { ...DEFAULT_YARD },
  partners: [
    {
      id: 'p1', name: '대성배관', name_en: 'Daesung Piping', cat: 'pipe',
      addr: '부산광역시 강서구 미음산단로', addr_en: 'Mieum Industrial Complex, Gangseo-gu, Busan',
      desc: '블록 배관 제작·설치 전문', desc_en: 'Block piping fabrication & install',
      lat: 35.1019, lng: 128.8516,
      items: [
        { id: 'i1', name: '1번 블록 배관 설치', prj: 'prj1', start: '2026-05-25', end: '2026-07-08', status: 'prog' },
        { id: 'i2', name: '2번 블록 배관 설치', prj: 'prj1', start: '2026-07-15', end: '2026-08-22', status: 'plan' },
        { id: 'i3', name: '거주구 배관 설치', prj: 'prj2', start: '2026-06-10', end: '2026-08-05', status: 'prog' },
      ],
    },
    {
      id: 'p2', name: '동양블록', name_en: 'Dongyang Block', cat: 'block',
      addr: '부산광역시 사하구 다대로', addr_en: 'Dadae-ro, Saha-gu, Busan',
      desc: '선박 블록 제작·조립', desc_en: 'Ship block fabrication & assembly',
      lat: 35.0461, lng: 128.9692,
      items: [
        { id: 'i4', name: '엔진룸 블록 조립', prj: 'prj1', start: '2026-04-10', end: '2026-06-20', status: 'prog' },
        { id: 'i5', name: '선미 블록 조립', prj: 'prj1', start: '2026-06-25', end: '2026-08-15', status: 'plan' },
      ],
    },
    {
      id: 'p3', name: '정밀의장', name_en: 'Jeongmil Outfitting', cat: 'outfit',
      addr: '경상남도 양산시 산막공단북5길', addr_en: 'Sanmak Industrial Complex, Yangsan',
      desc: '철의장품 제작 및 설치', desc_en: 'Steel outfitting fabrication & install',
      lat: 35.3604, lng: 129.0186,
      items: [
        { id: 'i6', name: '래더·핸드레일 설치', prj: 'prj2', start: '2026-05-01', end: '2026-07-10', status: 'prog' },
      ],
    },
    {
      id: 'p4', name: '해성거주구', name_en: 'Haesung Accommodation', cat: 'accom',
      addr: '부산광역시 사상구 학장로', addr_en: 'Hakjang-ro, Sasang-gu, Busan',
      desc: '거주구 블록 제작·의장', desc_en: 'Accommodation block & outfitting',
      lat: 35.1402, lng: 128.9871,
      items: [
        { id: 'i8', name: '거주구 블록 제작', prj: 'prj1', start: '2026-04-15', end: '2026-06-30', status: 'prog' },
        { id: 'i9', name: '거주구 내부 의장', prj: 'prj1', start: '2026-07-05', end: '2026-08-25', status: 'plan' },
      ],
    },
    {
      id: 'p5', name: '남부래싱', name_en: 'Nambu Lashing', cat: 'lashing',
      addr: '울산광역시 울주군 온산읍', addr_en: 'Onsan-eup, Ulju-gun, Ulsan',
      desc: '래싱브리지 제작·설치', desc_en: 'Lashing bridge fabrication & install',
      lat: 35.4214, lng: 129.3242,
      items: [
        { id: 'i10', name: '래싱브리지 설치', prj: 'prj2', start: '2026-06-01', end: '2026-08-10', status: 'plan' },
      ],
    },
  ],
  projects: [
    { id: 'prj1', name: '2031호선 (PCTC)', name_en: 'Hull 2031 (PCTC)', note: '자동차운반선', partnerIds: ['p1', 'p2', 'p4'] },
    { id: 'prj2', name: '2032호선 (LNG)', name_en: 'Hull 2032 (LNG)', note: 'LNG운반선', partnerIds: ['p1', 'p3', 'p5'] },
  ],
}

export function cloneSample() {
  return JSON.parse(JSON.stringify(SAMPLE))
}
