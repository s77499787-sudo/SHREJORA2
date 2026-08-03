const SUPABASE_URL = "https://bfzqhweoqodrkecnpvks.supabase.co";
const SUPABASE_KEY = "sb_publishable_cBdd1cRe4XJ8_lOar6q3Pw_F_SEpk2y";

const json = (statusCode, body) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function verifyUser(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: authHeader } });
  if (!r.ok) return null;
  return r.json();
}

async function shiprocketToken(email, password) {
  const r = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.token) { const err = new Error(data.message || "Shiprocket login failed"); err.step = "auth"; err.status = r.status; err.details = data; throw err; }
  return data.token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { ok:false, error:"Method not allowed" });
  try {
    const user = await verifyUser(event.headers.authorization || event.headers.Authorization);
    if (!user?.id) return json(401, { ok:false, error:"Login required" });

    const email = process.env.SHIPROCKET_API_EMAIL;
    const password = process.env.SHIPROCKET_API_PASSWORD;
    const pickup = process.env.SHIPROCKET_PICKUP_LOCATION;
    if (!email || !password) return json(500, { ok:false, error:"Shiprocket API credentials are not configured" });
    if (!pickup) return json(500, { ok:false, error:"SHIPROCKET_PICKUP_LOCATION is not configured" });

    const { order = {}, address = {}, items = [], customerEmail = "", totals = {} } = JSON.parse(event.body || "{}");
    if (!order.id || !address.full_name || !address.phone || !address.address_line || !address.city || !address.state || !address.pincode || !items.length) {
      return json(400, { ok:false, error:"Incomplete order or delivery details" });
    }

    const token = await shiprocketToken(email, password);
    const now = new Date();
    const orderDate = now.toISOString().slice(0,10) + " " + now.toTimeString().slice(0,5);
    const safeSku = (x, i) => String(x.sku || `SHR-${order.id}-${i+1}`).slice(0, 50);
    const subTotal = Number(totals.subtotal || items.reduce((s,x)=>s + Number(x.price||0)*Number(x.qty||x.quantity||1),0));
    const shipping = Number(totals.delivery || 0);
    const tax = Number(totals.tax || 0);
    const payload = {
      order_id: `SHREJORA-${String(order.id)}`, order_date: orderDate, pickup_location: String(pickup).trim(),
      billing_customer_name: String(address.full_name), billing_last_name: "",
      billing_address: String(address.address_line), billing_address_2: "",
      billing_city: String(address.city).trim(), billing_pincode: String(address.pincode).replace(/\D/g, "").slice(0,6),
      billing_state: String(address.state).trim(), billing_country: "India",
      billing_email: String(customerEmail || user.email || email || "").trim().toLowerCase(), billing_phone: String(address.phone).replace(/\D/g, "").slice(-10),
      shipping_is_billing: true,
      order_items: items.map((x,i)=>({ name:String(x.name||x.product_name||"Item"), sku:safeSku(x,i), units:Number(x.qty||x.quantity||1), selling_price:Number(x.price||0) })),
      payment_method: String(order.payment_method).toUpperCase()==="COD" ? "COD" : "Prepaid",
      shipping_charges: shipping, giftwrap_charges: 0, transaction_charges: 0, total_discount: 0,
      sub_total: Number((subTotal + tax).toFixed(2)),
      length: Number(process.env.SHIPROCKET_PACKAGE_LENGTH || 10), breadth: Number(process.env.SHIPROCKET_PACKAGE_BREADTH || 10),
      height: Number(process.env.SHIPROCKET_PACKAGE_HEIGHT || 5), weight: Number(process.env.SHIPROCKET_PACKAGE_WEIGHT || 0.2)
    };

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.billing_email)) payload.billing_email = String(email).trim().toLowerCase();
    if (payload.billing_phone.length !== 10) return json(400, { ok:false, step:"validation", error:"Customer phone must be a valid 10 digit number" });
    if (payload.billing_pincode.length !== 6) return json(400, { ok:false, step:"validation", error:"Delivery pincode must be a valid 6 digit pincode" });

    const r = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
      method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(payload)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.order_id) return json(r.status || 502, { ok:false, step:"create_order", error:data.message || data.error || "Shiprocket order creation failed", details:data });
    return json(200, { ok:true, shiprocket_order_id:data.order_id, shipment_id:data.shipment_id, status:data.status, status_code:data.status_code });
  } catch (e) { return json(e.status || 500, { ok:false, step:e.step || "function", error:e.message, details:e.details || null }); }
};
