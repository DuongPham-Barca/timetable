# Sổ Dạy Nhỏ

Một dashboard nhỏ để theo dõi lịch dạy, học phí và nhịp dạy trong tuần.

Xem [hướng dẫn sử dụng](HUONG_DAN_SU_DUNG.md) để biết cách thêm bé, ghi nhận buổi dạy và tải báo cáo tháng.

## Chạy dự án

```bash
pnpm install
pnpm dev
```

## Kết nối Firebase Firestore

1. Tạo Firebase project, đăng ký Web app và bật Cloud Firestore ở chế độ Test mode trong lúc phát triển.
2. Sao chép `.env.example` thành `.env.local`, rồi điền toàn bộ Firebase Web config.
3. Thêm các bé trong tab **Các bé** của ứng dụng. Ứng dụng chỉ hiển thị dữ liệu từ Firestore — không có fallback dữ liệu demo.

## Tổng hợp ngày dạy

Trong tab **Lịch**, chọn tháng để xem số ngày đã dạy của từng bé và tải file CSV. Một bé học nhiều buổi trong cùng ngày vẫn chỉ được tính một ngày. CSV có một cột cho mỗi bé, một dòng cho mỗi ngày trong tháng và dòng cuối là tổng số ngày. Các buổi chưa đánh dấu **Đã dạy** không được tính.

Khi sang tháng mới, nếu đang xem tháng hiện tại thì Lịch tự chuyển sang tháng mới và tổng số ngày đã dạy bắt đầu từ 0. Tháng cũ vẫn có thể xem và tải CSV.

Mỗi bé tự có lịch vào mọi ngày kể từ ngày bắt đầu của bé, kể cả cuối tuần. Bé mới bắt đầu từ ngày được thêm; bé đã có trước khi bật tính năng được gán ngày bắt đầu khi mở phiên bản mới lần đầu. Buổi tự hiện chỉ được lưu thành dữ liệu thật khi đánh dấu **Đã dạy** hoặc nhập thêm thông tin buổi học. Ngày chưa đánh dấu vẫn xuất hiện trong Lịch để ghi nhận muộn.

Chạy kiểm tra dữ liệu và CSV bằng `pnpm test` (cần Node.js 22 trở lên).

> File `firebase/firestore.rules` chỉ dùng cho giai đoạn phát triển vì đang mở quyền truy cập. Trước khi public app, cần bật Firebase Authentication và thay bằng rules theo người dùng.
