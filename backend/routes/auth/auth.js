const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

//VALIDATION OF USER INPUTS PREREQUISITES
const Joi = require("joi");

//AUTHORISATION RELATED API

const registerSchema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().min(6).required().email(),
  password: Joi.string().min(6).required(),
});

router.post("/register", async (req, res) => {
  //   console.log(req.body);
  //CHECK IF MAIL ALREADY EXISTS

  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) {
    res.status(200).send({ status: "400", message: "Email Already Exists" });
    return;
  }

  //HASHING THE PASSWORD

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const user = new User({
    email: req.body.email,
    password: hashedPassword,
  });

  try {
    //VALIDATION OF USER INPUTS

    const { error } = await registerSchema.validateAsync(req.body);
    if (error) {
      res.status(200).send({ status: "500", message: error });
    }
    //THE USER IS ADDED
    else {
      await user.save();
      res.status(200).send({ status: "200", message: "User Created" });
    }
  } catch (error) {
    res.status(200).send({ status: "500", message: error });
  }
});

//SIGNIN USER

router.post("/signin", async (req, res) => {
  //CHECKING IF EMAIL EXISTS

  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(200).send({ status: "400", message: 'Email doesn"t exist' });
    return;
  }

  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword) {
    res.status(200).send({ status: "400", message: "Incorrect Password !!!" });
    return;
  }

  try {
    const { error } = await loginSchema.validateAsync(req.body);
    if (error) {
      res.status(200).send({ status: "400", message: error });
      return;
    } else {
      //CREATE TOKEN
      const token = jwt.sign({
        _id: user._id,
        email:user.email
      }, process.env.TOKEN_SECRET);

      res
        .status(200)
        .header("auth-token", token)
        .send({
          status: "200",
          message: {
            token: token,
            userId: user._id,
            email: user.email,
          },
        });
    }
  } catch (error) {
    res.status(200).send({ status: "500", error });
  }
});

router.get('/auth_token/:token/', async(req,res)=>{
  var payload = await new Promise(async(resolve, reject)=>{
    try {
        let _payload = jwt.verify(req.params.token,
                  process.env.TOKEN_SECRET)
        resolve(_payload)
        
    } catch (error) {
        console.log(error)
        return res.send({
          status: "400",
          message: 'Something wrong' })
    }
  })
  
  const user = await User.findById(payload._id)

  if (!user) {
    return res.status(200).send({
      status: "400",
      message: 'Email doesn"t exist' });
  }
  user.emailVerified = true
  user.save()
  return res.send({
    status: "200",
    message: 'Verified' })

})

module.exports = router;
