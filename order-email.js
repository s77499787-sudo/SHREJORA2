exports.handler = async (event) => {
  const headers = { "Content-Type": "application/json" };

  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers, body: JSON.stringify({ ok:false, error:"Method not allowed" }) };
    }

    const { type, order = {}, customerEmail = "" } = JSON.parse(event.body || "{}");
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:"RESEND_API_KEY is not configured" }) };
    }

    const adminEmail = process.env.ADMIN_ORDER_EMAIL || "shreejacollection202@gmail.com";
    const from = process.env.ORDER_FROM_EMAIL || "SHREJORA <onboarding@resend.dev>";

    async function send(to, subject, html) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from, to: [to], subject, html })
      });

      const text = await response.text();
      return { ok: response.ok, status: response.status, body: text };
    }

    if (type === "new_order") {
      const id = order.id ?? "-";
      const total = Number(order.total_amount || 0).toFixed(2);
      const name = order.customer_name || "-";
      const phone = order.phone || "-";
      const payment = order.payment_method || "-";

      const adminResult = await send(
        adminEmail,
        `New SHREJORA Order #${id}`,
        `<h2>New order received</h2>
         <p><b>Order:</b> #${id}</p>
         <p><b>Customer:</b> ${name}</p>
         <p><b>Phone:</b> ${phone}</p>
         <p><b>Email:</b> ${customerEmail || "-"}</p>
         <p><b>Total:</b> ₹${total}</p>
         <p><b>Payment:</b> ${payment}</p>`
      );

      let customerResult = null;
      if (customerEmail) {
        customerResult = await send(
          customerEmail,
          `SHREJORA Order #${id} confirmed`,
          `<h2>Thank you for your order</h2>
           <p>Your SHREJORA order <b>#${id}</b> has been received.</p>
           <p><b>Total:</b> ₹${total}</p>
           <p><b>Payment:</b> ${payment}</p>`
        );
      }

      const ok = adminResult.ok && (!customerResult || customerResult.ok);
      return {
        statusCode: ok ? 200 : 502,
        headers,
        body: JSON.stringify({ ok, admin: adminResult, customer: customerResult })
      };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok:true, skipped:true }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:error.message }) };
  }
};
