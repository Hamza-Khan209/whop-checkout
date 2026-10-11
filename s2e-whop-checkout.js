/* Sweet2Elite shared Whop checkout (v1)
   Load once per funnel (Head Tracking Code), then on each checkout page use:
   <div data-s2e-checkout
        data-plan="plan_XXXX"
        data-return-url="https://yourdomain.com/thank-you"
        data-email="{{contact.email}}"></div>
*/
(function () {
  if (window.__s2eCheckout) return;
  window.__s2eCheckout = true;

  var ELEMENTS_SRC = "https://cdn.whop.com/elements/amber/elements.js";
  var MOBILE_OFFSET = 160, DESKTOP_OFFSET = 60;

  // Load Whop Elements once
  function loadElements(cb) {
    if (window.WhopElements) return cb();
    var existing = document.querySelector("script[data-whop-elements]");
    if (existing) { existing.addEventListener("load", cb); return; }
    var s = document.createElement("script");
    s.src = ELEMENTS_SRC;
    s.setAttribute("data-whop-elements", "");
    s.onload = cb;
    document.head.appendChild(s);
  }

  // Use a GHL merge field only if GHL actually filled it in
  function filled(value) {
    return value && value.indexOf("{{") === -1 ? value : "";
  }

  // Send the buyer to the thank-you page after a successful payment
  function goTo(returnUrl, paymentId) {
    var url = new URL(returnUrl);
    url.searchParams.set("payment", paymentId);
    url.searchParams.set("status", "succeeded");
    try { window.top.location.href = url.toString(); }
    catch (e) { window.location.href = url.toString(); }
  }

  // Keep the checkout in view when it changes height
  function autoScroll(box) {
    if (!("ResizeObserver" in window)) return;
    var engaged = false, ready = false, cooling = false;
    function markEngaged() { engaged = true; }

    box.addEventListener("touchstart", markEngaged, { passive: true });
    box.addEventListener("pointerdown", markEngaged, { passive: true });
    box.addEventListener("click", markEngaged, true);
    window.addEventListener("blur", function () {
      setTimeout(function () {
        if (document.activeElement && document.activeElement.tagName === "IFRAME") markEngaged();
      }, 0);
    });
    setTimeout(markEngaged, 20000);
    setTimeout(function () { ready = true; }, 3000);

    new ResizeObserver(function () {
      if (!ready || !engaged || cooling) return;
      var panel = box.closest(".tier-panel");
      if (panel && !panel.classList.contains("active")) return;

      cooling = true;
      setTimeout(function () { cooling = false; }, 1200);

      var stage = box.closest(".tier-stage") || box;
      var y0 = stage.getBoundingClientRect().top;
      if (y0 < -20) {
        var offset = window.innerWidth < 768 ? MOBILE_OFFSET : DESKTOP_OFFSET;
        var target = window.pageYOffset + y0 - offset;
        window.scrollTo({ top: target < 0 ? 0 : target, behavior: "smooth" });
      }
    }).observe(box);
  }

  // Mount every checkout placeholder on the page
  function mountAll() {
    var whop = window.WhopElements();
    document.querySelectorAll("[data-s2e-checkout]").forEach(function (el) {
      if (el.dataset.s2eMounted) return;
      el.dataset.s2eMounted = "1";

      var returnUrl = el.dataset.returnUrl;
      var email = filled(el.dataset.email);
      var username = filled(el.dataset.username);

      var options = {
        plan: el.dataset.plan,
        returnUrl: returnUrl,
        onComplete: function (result) {
          if (result.result !== "payment" || !returnUrl) return;
          goTo(returnUrl, result.paymentId);
        }
      };
      if (username) options.metadata = { username: username };

      var checkout = whop.checkout.create(options);
      checkout.create("checkout", {
        buyerEmail: email.indexOf("@") > -1 ? email : ""
      }).mount(el);

      autoScroll(el);
    });
  }

  function start() { loadElements(mountAll); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
  // Second pass for page elements GHL adds after the first load
  window.addEventListener("load", start);
})();
