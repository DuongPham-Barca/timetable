# Hướng dẫn sử dụng Sổ Dạy Nhỏ

Sổ Dạy Nhỏ giúp bạn theo dõi lịch dạy, ghi nhận các buổi đã dạy và xem tổng số **ngày dạy của từng bé** theo tháng.

## Bắt đầu

1. Mở trang web và chờ dữ liệu tải xong.
2. Chọn **Các bé** ở thanh menu dưới cùng, nhấn nút **+** để thêm bé đầu tiên. Nhập tên, môn học hoặc nội dung chính, chọn biểu tượng rồi nhấn **Thêm bé**.
3. Quay lại **Hôm nay** để xem lịch. Từ ngày được thêm, mỗi bé sẽ tự có một lịch hằng ngày, kể cả cuối tuần. Bạn có thể ghi nhận buổi dạy ngay mà không cần tạo lịch thủ công.

Nếu trang báo **Chưa kết nối Firebase** hoặc **Không thể tải dữ liệu Firebase**, hãy nhờ người quản lý trang kiểm tra kết nối trước khi nhập dữ liệu. Các nút lưu sẽ chỉ hoạt động khi dữ liệu đã tải xong.

## Ghi nhận buổi dạy

### Trong mục Hôm nay

- Mỗi thẻ hiển thị một buổi học của hôm nay. Nhấn **Đã dạy** để ghi nhận buổi học.
- Nếu đánh dấu nhầm, nhấn lại nút **Đã dạy rồi** để bỏ trạng thái đã dạy.
- Nhấn biểu tượng bút chì trên thẻ để thêm hoặc sửa ngày, giờ, số phút dạy và nội dung. Với lịch hằng ngày chưa có thông tin, thao tác này tạo một buổi học được lưu vào dữ liệu.
- Phần đầu trang cho biết số buổi đã hoàn thành, số buổi còn lại và tiến độ trong ngày.

### Trong mục Lịch

1. Dùng hai nút mũi tên cạnh tên tháng để chọn tháng cần xem.
2. Chạm vào một ngày để mở danh sách buổi học của ngày đó.
3. Nhấn **Đánh dấu đã dạy** cho từng buổi, hoặc **Đánh dấu tất cả đã dạy** để ghi nhận toàn bộ buổi còn lại trong ngày.
4. Nếu ngày đó không có lịch nhưng bạn đã dạy, chọn **Đánh dấu đã dạy ngày này**, chọn bé và nhấn **Lưu ngày đã dạy**.

Chú giải dưới lịch phân biệt ngày còn lịch, ngày đã dạy xong và ngày hôm nay. Bạn vẫn có thể mở ngày trong quá khứ để ghi nhận muộn.

## Thêm và quản lý buổi học

- Ở **Hôm nay**, **Lịch** hoặc **Tổng kết**, nhấn nút **+** ở góc dưới để thêm buổi dạy. Chọn bé, ngày học; giờ học, số phút và nội dung có thể nhập nếu cần. Sau đó nhấn **Lưu lịch học**.
- Nút **+** mở biểu mẫu với **ngày hôm nay** điền sẵn. Nếu muốn thêm buổi cho ngày khác, hãy đổi trường **Ngày học** trước khi lưu.
- Nhấn biểu tượng bút chì trên một buổi học để sửa thông tin đã lưu.
- Nên chọn đúng bé khi thêm buổi. Buổi chọn **Không chọn bé** sẽ không được tính vào báo cáo ngày dạy của bé nào.

Một bé có thể có nhiều buổi trong cùng một ngày. Các buổi này đều hiện trong lịch, nhưng báo cáo tháng chỉ tính **một ngày dạy** cho bé đó.

## Quản lý các bé

- Vào **Các bé** và nhấn **+** để thêm bé.
- Nhấn biểu tượng bút chì trên thẻ của bé để sửa tên, môn học hoặc biểu tượng.
- Thẻ của bé hiển thị số **buổi đã dạy trong tuần**.
- Nhấn biểu tượng thùng rác để xoá bé. Trang sẽ hỏi xác nhận; nếu đồng ý, toàn bộ buổi học đã lưu của bé cũng bị xoá. Hãy kiểm tra kỹ trước khi xác nhận.

Lịch hằng ngày của bé bắt đầu từ ngày thêm bé. Các lịch tự hiện chỉ trở thành dữ liệu đã lưu khi bạn đánh dấu **Đã dạy** hoặc nhập thông tin cho buổi học.

## Xem báo cáo và tải CSV

Trong **Lịch**, phần **Tổng hợp dạy tháng** hiển thị số ngày đã dạy và các ngày tương ứng của từng bé trong tháng đang xem. Chỉ những buổi đã đánh dấu **Đã dạy** mới được tính.

Nhấn **Tải CSV** để tải file `tong-hop-day-YYYY-MM.csv`. File có một cột cho mỗi bé, một dòng cho mỗi ngày trong tháng và dòng cuối là **Tổng số ngày**. Ô có số `1` nghĩa là bé đã được ghi nhận dạy trong ngày đó; ô trống nghĩa là chưa ghi nhận. Bạn có thể mở file bằng ứng dụng bảng tính.

Khi sang tháng mới, lịch sẽ tự chuyển sang tháng mới nếu bạn đang xem tháng hiện tại. Bạn vẫn có thể quay lại tháng cũ bằng nút mũi tên để xem hoặc tải lại báo cáo.

## Xem Tổng kết và đổi giao diện

Mục **Tổng kết** cho biết số buổi đã dạy trong tháng hiện tại, số buổi đã lên lịch, chuỗi ngày dạy liên tiếp và biểu đồ số buổi đã dạy trong tuần này. Các chỉ số ở đây tính theo **buổi**; báo cáo trong mục **Lịch** tính theo **ngày dạy của từng bé**.

Nhấn biểu tượng mặt trăng hoặc mặt trời ở góc trên để chuyển giữa giao diện sáng và tối.
