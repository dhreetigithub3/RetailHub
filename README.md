# 🛍️ RetailHub — Modern Spring Boot E-Commerce Platform

RetailHub is a full-stack e-commerce platform built using Java, Spring Boot, MySQL, and modern frontend technologies.
It provides complete customer and admin workflows including authentication, product management, orders, payments, analytics, and email notifications.

---

# ✨ Features

## 👤 Customer Features

* User registration & login
* JWT-based authentication
* OTP-based password reset
* Secure email verification flow
* Browse and search products
* Product reviews & ratings
* Shopping cart & checkout
* Razorpay payment integration
* Order tracking
* Responsive modern UI

---

## 🛠️ Admin Features

* Admin dashboard
* Product management
* Order management
* Customer management
* Sales analytics & reports
* Review moderation
* Export reports to PDF & Excel

---

# 🧰 Tech Stack

## Backend

* Java 17
* Spring Boot
* Spring Security
* JWT Authentication
* Spring Data JPA
* Hibernate

## Frontend

* HTML5
* CSS3
* JavaScript
* Responsive UI Design

## Database

* MySQL

## Tools & Integrations

* Razorpay
* Brevo Email API
* Docker
* Maven

---

# 📁 Project Structure

```text
RetailHub/
│
├── src/main/java
│   ├── controller/
│   ├── service/
│   ├── repository/
│   ├── entity/
│   ├── dto/
│   ├── config/
│   ├── exception/
│   └── filter/
│
├── src/main/resources
│   ├── static/
│   │   ├── css/
│   │   ├── js/
│   │   ├── assets/
│   │   └── *.html
│   │
│   └── application.properties
│
├── Dockerfile
├── pom.xml
└── README.md
```

---

# ⚙️ Prerequisites

Before running the project, make sure you have:

* Java 17+
* Maven 3.8+
* MySQL
* Docker (optional)

---

# 🚀 Run Locally

## 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/retailhub.git
cd retailhub
```

---

## 2️⃣ Configure Database

Update:

```text
src/main/resources/application.properties
```

Example:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/retailhub
spring.datasource.username=root
spring.datasource.password=your_password
```

---

## 3️⃣ Start the application

```bash
./mvnw spring-boot:run
```

Application will run at:

```text
http://localhost:8080
```

Signup page:

```text
http://localhost:8080/signup.html
```

---

# 📦 Build JAR

```bash
./mvnw clean package -DskipTests
```

Run:

```bash
java -jar target/retailhub-platform-0.0.1-SNAPSHOT.jar
```

---

# 🐳 Docker Setup

## Build Docker Image

```bash
docker build -t retailhub-platform .
```

---

## Run Docker Container

```bash
docker run -p 8080:8080 \
-e SPRING_DATASOURCE_URL="jdbc:mysql://host:3306/db" \
-e SPRING_DATASOURCE_USERNAME="user" \
-e SPRING_DATASOURCE_PASSWORD="pass" \
-e APP_JWT_SECRET="replace-with-secret" \
-e BREVO_API_KEY="your-brevo-api-key" \
-e BREVO_SENDER_EMAIL="your@email.com" \
-e RAZORPAY_KEY_ID="your-key-id" \
-e RAZORPAY_KEY_SECRET="your-secret" \
retailhub-platform
```

---

# ☁️ Deploy on Render

RetailHub can be deployed directly using Docker on Render.

## Recommended Settings

| Setting       | Value                                        |
| ------------- | -------------------------------------------- |
| Environment   | Docker                                       |
| Build Command | `docker build -t retailhub-platform .`       |
| Start Command | `docker run -p 8080:8080 retailhub-platform` |

---

# 🔐 Required Environment Variables

| Variable                     | Description          |
| ---------------------------- | -------------------- |
| `SPRING_DATASOURCE_URL`      | Database JDBC URL    |
| `SPRING_DATASOURCE_USERNAME` | Database username    |
| `SPRING_DATASOURCE_PASSWORD` | Database password    |
| `APP_JWT_SECRET`             | JWT secret key       |
| `BREVO_API_KEY`              | Brevo Email API key  |
| `BREVO_SENDER_EMAIL`         | Sender email address |
| `RAZORPAY_KEY_ID`            | Razorpay key         |
| `RAZORPAY_KEY_SECRET`        | Razorpay secret      |
| `SERVER_PORT`                | Optional server port |

---

# 🌐 Environment Configuration

Example `.env` configuration:

```env
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/retailhub
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password

APP_JWT_SECRET=your_jwt_secret

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your@email.com

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

---

# 🐋 Docker Container Architecture

RetailHub uses a containerized deployment architecture using Docker.

### Container Features

* Isolated runtime environment
* Easy cloud deployment
* Environment-based configuration
* Portable infrastructure
* Simplified CI/CD integration
* Production-ready deployment support

### Docker Workflow

```text
Developer → Docker Build → Docker Image → Container Runtime → Cloud Deployment
```

### Production Deployment Benefits

* Faster deployments
* Consistent environments
* Easier scalability
* Better dependency management
* Improved server portability
* Simplified infrastructure setup

---

# 📊 Core Modules

* Authentication & Authorization
* OTP Password Recovery System
* Email Notification System
* Product Catalog
* Cart & Checkout
* Order Management
* Payment Integration
* Review & Rating System
* Sales Analytics
* Admin Dashboard

---

# 🔒 Security

RetailHub uses:

* JWT Authentication
* Password Encryption
* OTP-based Password Recovery
* Role-based Authorization
* Secure REST APIs
* Secure Email Delivery using Brevo API

---

# 📸 Screenshots

Add screenshots here:

```text
assets/screenshots/
```

Example sections:

* Home Page
* Product Page
* Cart
* Checkout
* Admin Dashboard

---

# 🚀 Future Development Goals

Planned upcoming improvements for RetailHub:

* Wishlist functionality
* Advanced product filtering
* AI-based recommendations
* Real-time order tracking
* Coupon & discount system
* Dark mode support
* Multi-language support
* Customer chat support

---

# 📝 Notes

* Environment variables override `application.properties`
* Never commit secrets or credentials
* Ensure MySQL schema exists before startup

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Open a pull request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

Developed with ❤️ using Spring Boot & Java.
