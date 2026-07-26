# Mẫu email test cho Quotation Agent

Gửi các email dưới đây vào hộp thư `dangkhoi.tran@pmax.com.vn`.
Tiêu đề **phải chứa** `[Quotation]`. Đang bật chế độ thử nên chưa ghi Sheet thật, chưa gửi cho khách.

---

## Mẫu 1 — Cơ bản, 1 sản phẩm
**Tiêu đề:** `[Quotation] Báo giá ghế văn phòng`

**Nội dung:**
```
Chào shop,
Công ty ABC cần báo giá 10 ghế văn phòng, đơn giá 500.000đ.
Cảm ơn.
```
→ Kỳ vọng: ghi 1 dòng, thành tiền 5.000.000; trả lời xác nhận.

---

## Mẫu 2 — Nhiều sản phẩm trong 1 email
**Tiêu đề:** `[Quotation] Yêu cầu báo giá nội thất`

**Nội dung:**
```
Kính gửi bộ phận kinh doanh,
Công ty TNHH Minh Long cần báo giá các mặt hàng:
- Bàn làm việc: 5 cái, đơn giá 1.200.000đ
- Ghế xoay: 5 cái, đơn giá 650.000đ
- Tủ hồ sơ: 2 cái, đơn giá 2.100.000đ
Trân trọng.
```
→ Kỳ vọng: ghi 3 dòng (mỗi sản phẩm 1 dòng); 1 email xác nhận.

---

## Mẫu 3 — Thiếu thông tin (thiếu đơn giá)
**Tiêu đề:** `[Quotation] Hỏi giá máy in`

**Nội dung:**
```
Chào anh/chị,
Bên em là công ty Hải Đăng, cần mua 3 máy in.
Nhờ báo giá giúp em nhé.
```
→ Kỳ vọng: KHÔNG ghi Sheet; agent trả lời hỏi lại đơn giá/thông tin còn thiếu.

---

## Mẫu 4 — Văn phong tự nhiên, số viết chữ
**Tiêu đề:** `[Quotation] can bao gia`

**Nội dung:**
```
alo shop oi, ben cong ty Phuong Nam muon lay hai mươi thùng giấy A4,
gia 55k/thung. bao gia giup minh voi nhe. thanks
```
→ Kỳ vọng: hiểu 20 thùng, đơn giá 55.000; ghi 1 dòng.

---

## Mẫu 5 — Có VAT / ghi chú (kiểm tra không nhiễu)
**Tiêu đề:** `[Quotation] Báo giá laptop văn phòng`

**Nội dung:**
```
Gửi anh chị,
Công ty Đại Việt cần 8 laptop Dell, đơn giá 15.500.000đ/máy (chưa VAT).
Vui lòng gửi báo giá kèm thời gian giao hàng. Cảm ơn!
```
→ Kỳ vọng: ghi số lượng 8, đơn giá 15.500.000, thành tiền 124.000.000.

---

### Mẹo test nhanh
- Muốn quét ngay không chờ 5 phút: gửi email trước, rồi `Ctrl+C` và chạy lại `npm run dev`.
- Mỗi email chỉ xử lý 1 lần (chống trùng). Muốn test lại cùng nội dung, gửi email mới (message ID khác).
```
