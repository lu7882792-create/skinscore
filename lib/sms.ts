function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createVerificationCode() {
  return generateOtpCode();
}

export async function sendVerificationSms(phone: string, code: string) {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    return {
      sent: false,
      devMode: true,
      message: "未配置短信服务，开发模式下请在页面查看验证码。",
    };
  }

  // 预留阿里云短信接入位。当前项目默认走开发模式展示验证码。
  console.info(`[SMS] send to ${phone}, template=${templateCode}, code=${code}`);

  return {
    sent: true,
    devMode: false,
    message: "验证码已发送",
  };
}
