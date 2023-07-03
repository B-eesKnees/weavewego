const express = require("express");
const cors = require("cors");
const db = require("./db");
const path = require("path");

const bcrypt = require("bcrypt");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser"); // 연주 추가
const bodyParser = require("body-parser"); // 연주 추가
const jwt = require("jsonwebtoken"); // 연주 추가

const session = require("express-session");
const fs = require("fs");

dotenv.config();
//git 테스트

const app = express();
let corsOption = {
  origin: "http://localhost:8080",
  credentials: true,
};
app.use(cors(corsOption));
app.set("port", process.env.PORT || 3000); //포트 3000번으로 설정

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
      httpOnly: true,
      secure: false,
    },
  })
);

const authRouter = require("./routes/auth"); //routes폴더
const mainRouter = require("./routes/main");
const boardMakeRouter = require("./routes/boardCreate");
const myPageRouter = require("./routes/mypage"); // 마이페이지
const postDataRouter = require("./routes/post");
const changeProfileRouter = require("./routes/profile");

app.use("/auth", authRouter); // /autu 로그인 관련 라우터
app.use("/", mainRouter); // 메인페이지 관련 라우터
app.use("/boardCreate", boardMakeRouter); //임시
app.use("/mypage", myPageRouter); // 마이페이지 관련 라우터
app.use("/postdata", postDataRouter);
app.use("/profile", changeProfileRouter);

app.get("/downloadProfile/:userEmail/:fileName", (req, res) => {
  //프로필 이미지 다운 라우터
  const {
    //url에 있는 userEmail, fileName 받아오기
    userEmail,
    fileName,
  } = req.params;
  const filepath = `${__dirname}/userProfile/${userEmail}/${fileName}`; //받아온 걸로 다운받을 경로 만들기 ex)/profiles/test@test.com/image.png
  res.header(
    "Content-Type",
    `image/${fileName.substring(fileName.lastIndexOf("."))}`
  ); //이미지 보내는 코드인가?
  if (!fs.existsSync(filepath))
    res.send(404, {
      //경로에 이미지가 없으면 에러 처리
      error: "Can not found file.",
    });
  else fs.createReadStream(filepath).pipe(res); //파일 있으면 vue단으로 전송
});

app.get("/downloadCourse/:courseId/:fileName", (req, res) => {
  //게시글 이미지 다운 라우터
  const {
    //url에 있는 userEmail, fileName 받아오기
    courseId,
    fileName,
  } = req.params;
  const filepath = `${__dirname}/CourseImage/${courseId}/${fileName}`; //받아온 걸로 다운받을 경로 만들기 ex)/CourseImage/1/image.png
  res.header(
    "Content-Type",
    `image/${fileName.substring(fileName.lastIndexOf("."))}`
  ); //이미지 보내는 코드인가?
  if (!fs.existsSync(filepath))
    res.send(404, {
      //경로에 이미지가 없으면 에러 처리
      error: "Can not found file.",
    });
  else fs.createReadStream(filepath).pipe(res); //파일 있으면 vue단으로 전송
});

app.post("/uploadProfile/:userEmail/:fileName", async (req, res) => {
  //이용자 이미지 받아오는 라우터
  let { userEmail, fileName } = req.params; //url에 있는 userEmail, fileName 받아오기

  const dir = `${__dirname}/profiles/${userEmail}`;
  const file = `${dir}/${fileName}`; //경로 만들기 ex)/profiles/test@test.com/image.png

  if (!req.body.data) {
    //전송받은거에 이미지 데이터가 없다면 오류 처리 (일어난적은 못봄)
    return fs.unlink(file, async (err) =>
      res.send({
        err,
      })
    );
  }

  const data = req.body.data.slice(req.body.data.indexOf(";base64") + 8); //vue에서 전송될때 base64를 이용하여 전송해서 이런처리를 하는듯
  //왜 base64를 쓸까?

  if (!fs.existsSync(dir)) {
    //파일 경로가 없다면 ex)/profiles/test@test.com/image.png 생성하는 코드
    try {
      fs.mkdirSync(dir, { recursive: true }); //전체적으로 경로 만들게 하는 처리 /recursive: true
    } catch (err) {
      return res.send({
        //에러발생 시
        code: 400,
        failed: "error occurred while creating directory",
        error: err,
      });
    }
  }
  fs.writeFile(file, data, "base64", async (err) => {
    //이미지 넣는 코드인듯..?
    if (err) {
      res.send({
        code: 400,
        failed: "error occurred",
        error: err,
      });
    } else {
      //에러가 발생안하면
      // DB에 이미지 파일명 업데이트 코드 추가
      db.query(
        "UPDATE weavewego.user SET USER_IMAGE = ? WHERE USER_EMAIL = ?",
        [fileName, userEmail],
        (err) => {
          //왜 insert가 아니라 update인가? 회원가입 처리후 실행되는 쿼리라 update를 사용
          if (err) {
            res.send({
              //에러처리
              code: 400,
              failed: "error occurred",
              error: err,
            });
          } else {
            res.send({
              //성공시 코드 전송 / 메시지는 안보내기로 합의완료
              code: 200,
            });
          }
        }
      );
    }
  });
});

app.post("/uploadCourse/:boardID/:fileName", async (req, res) => {
  // 게시글 이미지 데이터받는 라우터 작동하는지는 안해봄..
  let { boardID, fileName } = req.params;

  const dir = `${__dirname}/courseImage/${boardID}`;
  const file = `${dir}/${fileName}`;

  if (!req.body.data) {
    return fs.unlink(file, async (err) =>
      res.send({
        err,
      })
    );
  }

  const data = req.body.data.slice(req.body.data.indexOf(";base64") + 8);

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      return res.send({
        code: 400,
        failed: "error occurred while creating directory",
        error: err,
      });
    }
  }
  fs.writeFile(file, data, "base64", async (err) => {
    if (err) {
      res.send({
        code: 400,
        failed: "error occurred",
        error: err,
      });
    } else {
      // DB에 이미지 파일명 업데이트 코드 추가
      db.query(
        "INSERT weavewego.image SET IMG_NUM = ?, IMG_PATH = ?",
        [boardID, fileName],
        (err) => {
          if (err) {
            res.send({
              code: 400,
              failed: "error occurred",
              error: err,
            });
          } else {
            res.send({
              code: 200,
              success: "image uploaded and user updated",
            });
          }
        }
      );
    }
  });
});



//---------------------------------------------------------------------------------
//게시글 수정 (이미지 추가 업로드)
app.post("/updateCourse/:boardID/:fileName", async (req, res) => {
  let { boardID, fileName } = req.params;

  const dir = `${__dirname}/CourseImage/${boardID}`;
  const file = `${dir}/${fileName}`;

  //dirname/courseimage/boardid/filename
  //CourseImage

  if (!req.body.data) {
    return res.status(400).send({
      code: 400,
      failed: "이미지 입력 값은 필수 입니다.",
    });
  }

  const data = req.body.data.slice(req.body.data.indexOf(";base64") + 8);

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      return res.send({
        code: 400,
        failed: "error occurred while creating directory",
        error: err,
      });
    }
  }
  fs.writeFile(file, data, "base64", async (err) => {
    if (err) {
      res.send({
        code: 400,
        failed: "error occurred",
        error: err,
      });
    } else {
      // DB에 이미지 파일명 업데이트 코드 추가
      db.query(
        "INSERT weavewego.image SET IMG_NUM ,IMG_PATH VALUES(2, `../CourseImage/2/leobao.jpg`)",
        [boardID, `../CourseImage/${boardID}/${fileName}`],
        (err) => {
          if (err) {
            res.send({
              code: 400,
              failed: "error occurred",
              error: err,
            });
          } else {
            res.send({
              code: 200,
              success: "image uploaded and user updated",
            });
          }
        }
      );
    }
  });
});
//---------------------------------------------------------------------------------

//게시글 수정 (이미지 삭제)

app.delete("/deleteImage/:boardID/:fileName", (req, res) => {
  const { boardID, fileName } = req.params;

  const dir = `${__dirname}/CourseImage/${boardID}`;
  const file = `${dir}/${fileName}`;

  fs.unlink(file, (err) => {
    if (err) {
      res.status(500).send({
        code: 500,
        error: "이미지 삭제 실패",
      });
    } else {
      // 이미지 삭제 후 DB에서 이미지 정보 업데이트 코드 추가
      db.query(
        "DELETE FROM weavewego.image WHERE IMG_NUM = ?",
        [boardID],
        (err) => {
          if (err) {
            res.status(500).send({
              code: 500,
              error: "이미지 업데이트에 실패했습니다.",
            });
          } else {
            res.status(200).send({
              code: 200,
              success: "이미지가 삭제되었습니다.",
            });
          }
        }
      );
    }
  });
});

const adminRouter = require('./routes/admin'); //어드민 관련 라우터
app.use('/admin', adminRouter); 

// 마이페이지
app.post("/mypage", (req, res) => {
  res.sendFile(path.join(__dirname, "/.html")); // 연결할 html 주소(마이페이지)
});

app.listen(app.get("port"), () => {
  //서버 연결
  console.log(app.get("port"), "번 대기중");
});
