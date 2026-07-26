# Bộ email test cho Quotation Agent

Mỗi ca test có: **mục đích**, **email để copy** (tiêu đề + nội dung), và **kết quả mong đợi**.

Cách dùng nhanh:
- Gửi từ **một tài khoản khác** tới `dangkhoi.tran@pmax.com.vn`, **đừng mở email ra** (giữ trạng thái chưa đọc).
- Muốn chạy ngay không chờ 5 phút: sau khi gửi, ở PowerShell bấm `Ctrl+C` rồi `npm run dev`.
- Đang ở chế độ thử: email trả lời chuyển hướng về hộp thư bạn (`[TEST MODE]`); dữ liệu ghi vào Sheet test.

> Lưu ý về giới hạn gửi: agent gửi tối đa **2 email/chu kỳ**. Nên test **từng ca một** để không bị chặn và dễ soi log.

---

## Ca 1 — Định dạng số hỗn hợp (500k, 1,2 triệu, 2tr5)
**Mục đích:** kiểm tra khả năng hiểu số kiểu nói tắt của người Việt.

**Tiêu đề:**
```
[Quotation] Báo giá đồ dùng chi nhánh mới
```
**Nội dung:**
```
Chào shop,

Bên mình là Nhà hàng Gạo Lứt, cần đặt:
- Ghế gỗ quán ăn: 40 cái, giá 500k/cái
- Bàn gỗ 4 người: 12 bộ, khoảng 1,2 triệu/bộ
- Quầy pha chế inox: 1 cái, tầm 2tr5

Gửi báo giá giúp mình nhé. Liên hệ: Tuấn - 0912xxxxxx
```
**Mong đợi:** 3 dòng. Đơn giá được chuẩn hoá về số: 500.000 / 1.200.000 / 2.500.000. Thành tiền tự tính (VD ghế: 40 × 500.000 = 20.000.000).

---

## Ca 2 — Bảng báo giá đầy đủ, nhiều dòng
**Mục đích:** ca "sạch", nhiều dòng, thông tin rõ ràng.

**Tiêu đề:**
```
[Quotation] Đặt hàng vật tư văn phòng tháng 8
```
**Nội dung:**
```
Kính gửi phòng Kinh doanh,

Công ty CP Đầu tư Hải Đăng cần đặt các mặt hàng sau:

STT | Sản phẩm | Số lượng | Đơn giá
1 | Giấy A4 Double A | 200 ream | 78.000
2 | Bút bi Thiên Long TL-027 | 500 cây | 4.500
3 | Bìa còng A4 5cm | 120 cái | 32.000
4 | Mực in HP 12A | 30 hộp | 1.450.000

Người liên hệ: Ngô Thị Hạnh - hanh.ngo@haidang.vn - 0987xxxxxx
Trân trọng.
```
**Mong đợi:** đúng 4 dòng, số liệu khớp bảng; email khách = haidang.vn; tên KH = Công ty CP Đầu tư Hải Đăng.

---

## Ca 3 — Thiếu số lượng ở một mục
**Mục đích:** kiểm tra khi thiếu 1 trường bắt buộc → phải hỏi lại, không đoán.

**Tiêu đề:**
```
[Quotation] Hỏi giá thiết bị bếp
```
**Nội dung:**
```
Hi anh/chị,

Bên em cần báo giá:
- Bếp từ công nghiệp 5kW: 6 cái, đơn giá 3.200.000
- Nồi inox 40L: cần một ít, chưa chốt số lượng, giá 850.000/cái

Nhờ anh chị báo sớm. Em là Phúc bên Bếp Nhà Việt (phuc@bepnhaviet.com).
```
**Mong đợi:** ghi 1 dòng cho bếp từ (đủ thông tin). Với nồi inox (thiếu số lượng) → **không tạo dòng**, mà nêu trong email trả lời để hỏi rõ số lượng.

---

## Ca 4 — Khách chỉ hỏi giá, chưa có đơn giá nào
**Mục đích:** kiểm tra khi không có đơn giá → agent phải hỏi/không bịa số.

**Tiêu đề:**
```
[Quotation] Cần báo giá in ấn
```
**Nội dung:**
```
Chào bạn,

Mình cần in 1.000 tờ rơi A5 và 200 poster A2 cho sự kiện.
Bạn báo giá giúp mình với nhé. Cảm ơn!
Mai Anh - maianh.design@gmail.com
```
**Mong đợi:** không có đơn giá trong email → agent **không ghi Sheet**, trả lời hỏi thêm (hoặc xác nhận đã nhận và sẽ báo giá). Tuyệt đối không tự bịa đơn giá.

---

## Ca 5 — Email tiếng Anh
**Mục đích:** hiểu email tiếng Anh, nhưng **trả lời vẫn bằng tiếng Việt**.

**Tiêu đề:**
```
[Quotation] Request for quotation - IT equipment
```
**Nội dung:**
```
Dear Sales team,

We are ABC Global Ltd. Please quote for:
- Dell Latitude 5450 laptop: 15 units, unit price 18,500,000 VND
- Logitech MX Keys keyboard: 15 units, 2,400,000 VND each

Contact: John Tran - john.tran@abcglobal.com

Best regards.
```
**Mong đợi:** 2 dòng đúng số; email xác nhận trả lời **bằng tiếng Việt** (đúng quy tắc của agent).

---

## Ca 6 — Email lan man, thông tin rải rác + có nhiễu
**Mục đích:** trích xuất khi dữ liệu không nằm gọn, có câu chữ gây nhiễu (chiết khấu, thời hạn).

**Tiêu đề:**
```
[Quotation] V/v đặt bàn ghế sự kiện
```
**Nội dung:**
```
Chào anh,

Em bên Sen Vàng Events. Bên em đang chuẩn bị cho một sự kiện lớn cuối tháng.
Anh cho em xin báo giá ghế Tiffany nhé, em cần 300 cái, đơn giá em thấy tham
khảo đâu đó khoảng 145.000/cái. À mà nếu đặt nhiều vậy có chiết khấu không anh?
Ngoài ra thêm 30 bộ bàn tròn 1m6 nữa, giá 480.000/bộ.

Gấp anh nhé, trước thứ 6 tuần này. Em Trang - 0933xxxxxx.
```
**Mong đợi:** 2 dòng (ghế Tiffany 300 × 145.000; bàn tròn 30 × 480.000). Câu hỏi chiết khấu/thời hạn là nhiễu — không thành dòng dữ liệu; agent có thể nhắc lại trong email trả lời.

---

## Gợi ý soi kết quả
Với mỗi ca, đối chiếu 3 nơi:
1. **Log PowerShell:** số lần `record_quotation`, có `send_reply`/`reply_sent`, không có dòng `level:"error"`.
2. **Tab `Quotations`:** số dòng và con số thành tiền có khớp không.
3. **Hộp thư của bạn:** email trả lời `[TEST MODE]` — nội dung tiếng Việt, xác nhận đúng, và có hỏi lại ở các ca thiếu thông tin (Ca 3, Ca 4).
