package com.retailhub.platform.service;

import java.io.UnsupportedEncodingException;
import java.time.format.DateTimeFormatter;
import java.util.List;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service;

import com.retailhub.platform.entity.OrderItem;
import com.retailhub.platform.entity.PurchaseOrder;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy");

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.brand.name:RetailHub}")
    private String brandName;

    @Value("${app.brand.supportEmail:retailhub052026@gmail.com}")
    private String supportEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOrderPlaced(PurchaseOrder order, List<OrderItem> items) {
        if (!canSend(order))
            return;
        String subject = String.format("%s — Order Confirmation #%d", brandName, order.getId());
        String html = buildOrderHtml(order, items, "Order Placed",
                "We have received your order and will notify you when it ships.");
        sendHtml(order.getUser().getEmail(), subject, html);
    }

    public void sendOrderShipped(PurchaseOrder order, List<OrderItem> items, String trackingUrl, String trackingId) {
        if (!canSend(order))
            return;
        String subject = String.format("%s — Your order #%d has shipped", brandName, order.getId());
        String extra = "Your order is on the way" + (trackingId != null ? ": " + trackingId : "");
        String html = buildOrderHtml(order, items, "Shipped", extra)
                .replace("{{trackingUrl}}", trackingUrl != null ? trackingUrl : "")
                .replace("{{trackingId}}", trackingId != null ? trackingId : "");
        sendHtml(order.getUser().getEmail(), subject, html);
    }

    public void sendOrderDelivered(PurchaseOrder order, List<OrderItem> items) {
        if (!canSend(order))
            return;
        String subject = String.format("%s — Order Delivered #%d", brandName, order.getId());
        String html = buildOrderHtml(order, items, "Delivered", "Your order has been delivered. Enjoy!");
        sendHtml(order.getUser().getEmail(), subject, html);
    }

    public void sendOrderCancelled(PurchaseOrder order, List<OrderItem> items, String reason) {
        if (!canSend(order))
            return;
        String subject = String.format("%s — Order Cancelled #%d", brandName, order.getId());
        String html = buildOrderHtml(order, items, "Cancelled", reason != null ? reason : "This order was cancelled.");
        sendHtml(order.getUser().getEmail(), subject, html);
    }

    private boolean canSend(PurchaseOrder order) {
        return order != null && order.getUser() != null && order.getUser().getEmail() != null
                && !order.getUser().getEmail().isBlank();
    }

    @Async
    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "utf-8");
            helper.setFrom(fromEmail, "RetailHub");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            System.out.println("Successfully email sent");
        } catch (MessagingException | UnsupportedEncodingException e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
            System.out.println("Sending failed");
        } finally {
            System.out.print("Sending email end");
        }
    }

    private String buildOrderHtml(PurchaseOrder order, List<OrderItem> items, String statusLabel, String headerText) {
        StringBuilder itemsHtml = new StringBuilder();
        if (items != null) {
            for (OrderItem it : items) {
                itemsHtml.append("<tr style=\"border-bottom:1px solid #e9e9e9;\">")
                        .append("<td style=\"padding:12px;vertical-align:top;\"><img src=\"")
                        .append(it.getProduct().getImageUrl() != null ? it.getProduct().getImageUrl()
                                : "https://via.placeholder.com/64")
                        .append("\" style=\"width:64px;height:64px;object-fit:cover;border-radius:6px;\"/></td>")
                        .append("<td style=\"padding:12px;vertical-align:top;\"><strong>")
                        .append(escapeHtml(it.getProduct().getName()))
                        .append("</strong><div style=\"font-size:13px;color:#666;padding-top:6px;\">Qty: ")
                        .append(it.getQuantity())
                        .append(" × ")
                        .append(it.getPriceAtPurchase())
                        .append("</div></td>")
                        .append("<td style=\"padding:12px;vertical-align:top;text-align:right;\"><strong>₹")
                        .append(it.getPriceAtPurchase().multiply(java.math.BigDecimal.valueOf(it.getQuantity())))
                        .append("</strong></td>")
                        .append("</tr>");
            }
        }

        String addressHtml = "<div style=\"font-size:14px;color:#444;\">No address provided</div>";
        if (order.getDeliveryAddress() != null) {
            addressHtml = "<div style=\"font-size:14px;color:#444;\">" +
                    escapeHtml(order.getDeliveryAddress().getStreet()) + "<br>" +
                    escapeHtml(order.getDeliveryAddress().getCity()) + ", "
                    + escapeHtml(order.getDeliveryAddress().getState()) + " - "
                    + escapeHtml(order.getDeliveryAddress().getZipCode()) + "<br>" +
                    escapeHtml(order.getDeliveryAddress().getCountry()) + "<br></div>";
        }

        String trackingSection = "";
        // placeholders will be replaced if present
        // trackingSection = "<div style=\"margin-top:12px;font-size:14px;\">Tracking:
        // <a href=\"{{trackingUrl}}\">{{trackingId}}</a></div>";

        String html = "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<meta charset=\"UTF-8\">" +
                "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                "<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\">" +

                "<style>" +
                "body{margin:0;padding:0;background:#f1f3f6;font-family:Arial,Helvetica,sans-serif;color:#212121;}" +
                "table{border-collapse:collapse;border-spacing:0;}" +
                "img{border:0;display:block;}" +

                "@media only screen and (max-width:600px){" +
                ".container{width:100%!important;}" +
                ".mobile-padding{padding:16px!important;}" +
                ".stack-column,.stack-column td{" +
                "display:block!important;width:100%!important;text-align:left!important;}" +
                ".mobile-center{text-align:center!important;}" +
                ".product-img{width:72px!important;height:72px!important;}" +
                "}" +
                "</style>" +

                "<title>" + escapeHtml(brandName) + "</title>" +
                "</head>" +

                "<body>" +

                "<table width=\"100%\" bgcolor=\"#f1f3f6\" cellpadding=\"0\" cellspacing=\"0\">" +
                "<tr>" +
                "<td align=\"center\" style=\"padding:20px 10px;\">" +

                "<table class=\"container\" width=\"700\" bgcolor=\"#ffffff\" cellpadding=\"0\" cellspacing=\"0\" " +
                "style=\"max-width:700px;background:#ffffff;\">" +

                "<tr>" +
                "<td style=\"background:#2874f0;padding:18px 24px;color:#ffffff;\">" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +
                "<tr>" +

                "<td align=\"left\">" +
                "<h2 style=\"margin:0;font-size:24px;font-weight:bold;\">" +
                escapeHtml(brandName) +
                "</h2>" +
                "</td>" +

                "<td align=\"right\" style=\"font-size:18px;font-weight:bold;\">" +
                escapeHtml(headerText) +
                "</td>" +

                "</tr>" +
                "</table>" +

                "</td>" +
                "</tr>" +

                "<tr>" +
                "<td class=\"mobile-padding\" style=\"padding:24px;\">" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +

                "<tr>" +
                "<td style=\"font-size:14px;color:#212121;padding-bottom:8px;\">" +
                "Hi <strong>" + escapeHtml(order.getUser().getName()) + "</strong>," +
                "</td>" +
                "</tr>" +

                "<tr>" +
                "<td style=\"font-size:13px;color:#555;padding-bottom:20px;line-height:1.6;\">" +
                "Your order status has been updated." +
                "</td>" +
                "</tr>" +

                "</table>" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" " +
                "style=\"border:1px solid #dfe1e5;background:#ffffff;\">" +

                "<tr>" +

                "<td style=\"padding:16px;border-bottom:1px solid #eaeaea;\">" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +

                "<tr class=\"stack-column\">" +

                "<td valign=\"top\" style=\"font-size:13px;color:#555;line-height:1.8;width:50%;\">" +

                "<strong>Order placed on</strong><br>" +
                escapeHtml(order.getCreatedAt().format(formatter)) +

                "</td>" +

                "<td valign=\"top\" align=\"right\" style=\"font-size:13px;color:#555;line-height:1.8;width:50%;\">" +

                "<strong>Order ID</strong><br>" +
                order.getId() +

                "</td>" +

                "</tr>" +

                "</table>" +

                "</td>" +

                "</tr>" +

                "<tr>" +

                "<td style=\"padding:18px;\">" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">" +

                "<tr class=\"stack-column\">" +

                "<td valign=\"top\" style=\"padding-bottom:20px;width:60%;\">" +

                "<div style=\"font-size:14px;font-weight:bold;color:#212121;padding-bottom:8px;\">" +
                escapeHtml(statusLabel) +
                "</div>" +

                trackingSection +

                "</td>" +

                "<td valign=\"top\" align=\"right\" style=\"width:40%;\">" +

                "<div style=\"font-size:13px;color:#555;line-height:1.7;text-align:left;\">" +

                "<strong>Delivery Address</strong><br>" +

                addressHtml +

                "</div>" +

                "</td>" +

                "</tr>" +

                "</table>" +

                "</td>" +

                "</tr>" +

                "</table>" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:24px;\">" +

                itemsHtml.toString() +

                "</table>" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:20px;\">" +

                "<tr>" +

                "<td align=\"right\">" +

                "<table width=\"260\" cellpadding=\"0\" cellspacing=\"0\">" +

                "<tr>" +
                "<td style=\"font-size:13px;color:#555;padding:6px 0;\">Items Total</td>" +
                "<td align=\"right\" style=\"font-size:13px;color:#212121;padding:6px 0;\">" +
                "₹" + order.getTotalAmount() +
                "</td>" +
                "</tr>" +

                "<tr>" +
                "<td style=\"font-size:13px;color:#555;padding:6px 0;\">Shipping Charges</td>" +
                "<td align=\"right\" style=\"font-size:13px;color:#388e3c;padding:6px 0;\">" +
                "FREE" +
                "</td>" +
                "</tr>" +

                "<tr>" +
                "<td style=\"font-size:16px;font-weight:bold;padding-top:10px;color:#212121;\">" +
                "Total" +
                "</td>" +
                "<td align=\"right\" style=\"font-size:18px;font-weight:bold;padding-top:10px;color:#212121;\">" +
                "₹" + order.getTotalAmount() +
                "</td>" +
                "</tr>" +

                "</table>" +

                "</td>" +

                "</tr>" +

                "</table>" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:30px;\">" +

                "<tr>" +

                "<td style=\"font-size:14px;color:#212121;padding-bottom:10px;\">" +
                "<strong>Payment Method</strong>" +
                "</td>" +

                "</tr>" +

                "<tr>" +

                "<td style=\"font-size:13px;color:#555;line-height:1.6;\">" +

                escapeHtml(order.getPaymentMethod() != null
                        ? order.getPaymentMethod()
                        : "Unknown")
                +

                "</td>" +

                "</tr>" +

                "</table>" +

                "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:32px;border-top:1px solid #eaeaea;\">"
                +

                "<tr>" +

                "<td align=\"center\" style=\"padding:20px;font-size:12px;color:#777;line-height:1.8;\">" +

                "Thank you for shopping with " +
                "<strong>" + escapeHtml(brandName) + "</strong><br>" +

                "If you need help, contact us at <br>" +
                "<strong>" + escapeHtml(supportEmail) + "</strong>" +

                "</td>" +

                "</tr>" +

                "</table>" +

                "</td>" +
                "</tr>" +

                "</table>" +

                "</td>" +
                "</tr>" +
                "</table>" +

                "</body>" +
                "</html>";

        return html;
    }

    private String escapeHtml(Object o) {
        if (o == null)
            return "";
        String s = String.valueOf(o);
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'",
                "&#39;");
    }
}
