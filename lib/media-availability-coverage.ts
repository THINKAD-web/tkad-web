/** 매체 상세 가용성 데이터 충분 여부 (공개 캘린더 정직 안내용) */

/** MediaBooking(tentative|confirmed) 이 이 값 이하면 "데이터 부족" 안내 */
export const AVAILABILITY_SPARSE_MAX_BOOKINGS = 0;

export function isAvailabilityDataSparse(blockingBookingCount: number): boolean {
  return blockingBookingCount <= AVAILABILITY_SPARSE_MAX_BOOKINGS;
}
