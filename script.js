// =========================================================================
// 1. GÜVENLİK DUVARI (Oturum Açılmamışsa Giriş Sayfasına Geri Gönderir)
// =========================================================================
if (sessionStorage.getItem("ed_oturum_aktif") !== "true") {
    alert("Yetkisiz Erişim! Lütfen önce giriş yapın şefim.");
    window.location.href = "login.html";
}

// Güvenli Çıkış Motoru
function sistemdenCikisYap() {
    if(confirm("Sistemden çıkış yapmak istediğinize emin misiniz?")) {
        sessionStorage.removeItem("ed_oturum_aktif");
        window.location.href = "login.html";
    }
}

// =========================================================================
// 2. FIREBASE REALTIME DATABASE BAĞLANTI AYARLARI
// =========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyYOUR_ACTUAL_API_KEY",
    authDomain: "puantaj-51bda.firebaseapp.com",
    databaseURL: "https://puantaj-51bda-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "puantaj-51bda",
    storageBucket: "puantaj-51bda.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:123456789:web:abcdef"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// Global Sistem Değişkenleri
let aktifYil, aktifAy, toplamGunSayisi;
let tumKullanicilar = {};
let secilenDepartman = "HEPSİ";
let mobilSeciliGun = 1; 

// Uygulama Başlangıç Motoru
window.onload = function() {
    SaatVeTarihMotoru();
    FirebaseBaglantiDurumuDinle();
    
    const bugun = new Date();
    const buAyStr = bugun.getFullYear() + "-" + String(bugun.getMonth() + 1).padStart(2, '0');
    document.getElementById("donemSecici").value = buAyStr;
    
    mobilSeciliGun = bugun.getDate(); 
    donemDegisti();
};

// Canlı Eşitleme Durumu Dinleyicisi
function FirebaseBaglantiDurumuDinle() {
    db.ref(".info/connected").on("value", (snap) => {
        const dot = document.getElementById("sync-status-dot");
        const txt = document.getElementById("sync-status-text");
        if (!dot || !txt) return;
        if (snap.val() === true) {
            dot.style.background = "#10b981"; 
            dot.style.boxShadow = "0 0 8px #10b981";
            txt.innerText = "Bulut Eşitleme Aktif (Multi-Device)";
        } else {
            dot.style.background = "#ef4444"; 
            dot.style.boxShadow = "0 0 8px #ef4444";
            txt.innerText = "Bağlantı Kesildi / Aranıyor...";
        }
    });
}

// Dönem Değiştiğinde Takvimi Yeniden Kurup Verileri Çeken Fonksiyon
function donemDegisti() {
    const donemDegeri = document.getElementById("donemSecici").value;
    if (!donemDegeri) return;

    const parts = donemDegeri.split("-");
    aktifYil = parseInt(parts[0]);
    aktifAy = parseInt(parts[1]);

    toplamGunSayisi = new Date(aktifYil, aktifAy, 0).getDate();
    if (mobilSeciliGun > toplamGunSayisi) mobilSeciliGun = toplamGunSayisi;

    TabloBasliklariniOlustur();
    MobilGunSeridiOlustur();
    VerileriGeriYukle();
}

function VerileriGeriYukle() {
    db.ref("personeller").on("value", (snapshot) => {
        tumKullanicilar = snapshot.val() || {};
        TabloGövdesiniDoldur();
        MobilKartlariniDoldur();
        GelmeyenSayisiniGuncelle();
    });
}

// =========================================================================
// 3. MASAÜSTÜ TABLO GÖRÜNÜM MOTORU
// =========================================================================
function ToplamFazlaMesaiHesapla(personelObj, donemKey) {
    let toplam = 0;
    if (personelObj.puantaj && personelObj.puantaj[donemKey]) {
        Object.keys(personelObj.puantaj[donemKey]).forEach(gun => {
            const kayit = personelObj.puantaj[donemKey][gun];
            if (kayit && kayit.durum === "GELDI" && kayit.fazlaMesai) {
                toplam += parseFloat(kayit.fazlaMesai) || 0;
            }
        });
    }
    return toplam;
}

function TabloBasliklariniOlustur() {
    const baslikSatiri = document.getElementById("tabloBaslikSatiri");
    if (!baslikSatiri) return;
    let html = `<th class="sticky-col" style="z-index:6; text-align:center;">Personel & Görev Dağılımı</th>`;
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 1; i <= toplamGunSayisi; i++) {
        const tarihObj = new Date(aktifYil, aktifAy - 1, i);
        const gunIndeks = tarihObj.getDay();
        let倾斜Sinif = (gunIndeks === 0 || gunIndeks === 6) ? "weekend" : "";
        html += `<th class="day-th ${ekstraSinif}">${i} <span>${gunAdlari[gunIndeks]}</span></th>`;
    }
    baslikSatiri.innerHTML = html;
}

function TabloGövdesiniDoldur() {
    const govde = document.getElementById("tabloGövdeSatirlari");
    if (!govde) return;
    govde.innerHTML = "";
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const fMesai = ToplamFazlaMesaiHesapla(p, donemKey);
        let satirHtml = `<tr>`;
        
        satirHtml += `
            <td class="sticky-col">
                <div class="personnel-cell-wrapper">
                    <div class="personnel-info" onclick="mesaiDetayModaliAc('${perId}')" style="cursor:pointer;">
                        <strong>${p.adSoyad}</strong>
                        <span>${p.departman}</span>
                    </div>
                    <div class="badge-and-actions">
                        <span class="total-hours-badge" onclick="mesaiDetayModaliAc('${perId}')">${fMesai} Saat</span>
                        <div class="cell-actions">
                            <button class="btn-per-edit" onclick="personelDuzenleHazirlik('${perId}')" title="Düzenle"><i class="fa-solid fa-pen-to-square"></i></button>
                            <button class="btn-per-delete" onclick="personelSil('${perId}')" title="Sil"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            </td>
        `;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        for (let g = 1; g <= toplamGunSayisi; g++) {
            const kayit = pDonemi[g] || { durum: "BOS" };
            const durum = kayit.durum;
            const tarihObj = new Date(aktifYil, aktifAy - 1, g);
            let h_sinif = (tarihObj.getDay() === 0 || tarihObj.getDay() === 6) ? "weekend" : "";

            let butonIcerik = "-";
            if (durum === "GELDI") {
                const fmYazi = kayit.fazlaMesai > 0 ? `+${kayit.fazlaMesai}` : "";
                butonIcerik = `<span class="d-text">G</span>${fmYazi ? '<span class="fm-sub">'+fmYazi+'</span>' : ''}`;
            } else if (durum === "GELMEDI") butonIcerik = "YOK";
            else if (durum === "H_IZIN") butonIcerik = "H.İ";
            else if (durum === "Y_IZIN") butonIcerik = "Y.İ";
            else if (durum === "C_IZIN") butonIcerik = "C.İ";
            else if (durum === "RAPOR") butonIcerik = "R";

            satirHtml += `
                <td class="${h_sinif}">
                    <button class="day-btn ${durum}" onclick="durumSecimPenceresi('${perId}', ${g})">
                        ${butonIcerik}
                    </button>
                </td>
            `;
        }
        satirHtml += `</tr>`;
        govde.innerHTML += satirHtml;
    });
}

// =========================================================================
// 4. TELEFON (MOBİL) GÖRÜNÜM MOTORU
// =========================================================================
function MobilKartlariniDoldur() {
    const kapsayici = document.getElementById("mobilKartKapsayici");
    if (!kapsayici) return;
    kapsayici.innerHTML = "";
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        const gunlukKayit = pDonemi[mobilSeciliGun] || { durum: "BOS", normalMesai: 9, fazlaMesai: 0 };
        const durum = gunlukKayit.durum;

        let durumMetni = "Boş Bırakılmış";
        let durumRenkClass = "mob-bos";
        if (durum === "GELDI") { 
            durumMetni = `Geldi (${gunlukKayit.normalMesai}s ${gunlukKayit.fazlaMesai > 0 ? '+'+gunlukKayit.fazlaMesai+'s' : ''})`; 
            durumRenkClass = "mob-geldi"; 
        }
        else if (durum === "GELMEDI") { durumMetni = "Gelmedi (YOK)"; durumRenkClass = "mob-gelmedi"; }
        else if (durum === "H_IZIN") { durumMetni = "Haftalık İzin"; durumRenkClass = "mob-hizin"; }
        else if (durum === "Y_IZIN") { durumMetni = "Yıllık İzin"; durumRenkClass = "mob-yizin"; }
        else if (durum === "C_IZIN") { durumMetni = "Cenaze İzni"; durumRenkClass = "mob-cizin"; }
        else if (durum === "RAPOR") { durumMetni = "Sağlık Raporu"; durumRenkClass = "mob-rapor"; }

        kapsayici.innerHTML += `
            <div class="mobile-personnel-card">
                <div class="mobile-card-main-row">
                    <div class="mobile-card-info" onclick="mesaiDetayModaliAc('${perId}')" style="cursor:pointer; flex:1;">
                        <strong>${p.adSoyad}</strong>
                        <span>${p.departman}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; flex-shrink:0;">
                        <button class="day-btn-mobile ${durumRenkClass}" onclick="durumSecimPenceresi('${perId}', ${mobilSeciliGun})">
                            ${durumMetni}
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
}

function MobilGunSeridiOlustur() {
    const serit = document.getElementById("mobilGunSeridi");
    if (!serit) return;
    serit.innerHTML = "";
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let i = 1; i <= toplamGunSayisi; i++) {
        const tarihObj = new Date(aktifYil, aktifAy - 1, i);
        let aktifClass = (i === mobilSeciliGun) ? "active" : "";
        let weekendClass = (tarihObj.getDay() === 0 || tarihObj.getDay() === 6) ? "weekend" : "";

        serit.innerHTML += `
            <div class="mobile-day-capsule ${aktifClass} ${weekendClass}" onclick="mobilGunSec(${i})">
                <span class="mob-num">${i}</span>
                <span class="mob-txt">${gunAdlari[tarihObj.getDay()]}</span>
            </div>
        `;
    }
}

function mobilGunSec(gunNo) {
    mobilSeciliGun = gunNo;
    const kapsuller = document.querySelectorAll("#mobilGunSeridi .mobile-day-capsule");
    kapsuller.forEach((k, idx) => {
        if ((idx + 1) === gunNo) k.classList.add("active");
        else k.classList.remove("active");
    });
    MobilKartlariniDoldur();
    GelmeyenSayisiniGuncelle();
}

// =========================================================================
// 5. GELMEYENLER MODALI & GERİYE DÖNÜK AKILLI TAKVİM MOTORU
// =========================================================================
function gelmeyenlerModaliAc() {
    const sorguInput = document.getElementById("gelmeyenSorguTarihi");
    sorguInput.value = `${aktifYil}-${String(aktifAy).padStart(2, '0')}-${String(mobilSeciliGun).padStart(2, '0')}`;
    gelmeyenListesiniGuncelle(aktifYil, aktifAy, mobilSeciliGun);
    document.getElementById("gelmeyenlerModal").style.display = "block";
}

function gelmeyenTarihDegisti(tarihStr) {
    if(!tarihStr) return;
    const parts = tarihStr.split("-");
    gelmeyenListesiniGuncelle(parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]));
}

function gelmeyenListesiniGuncelle(yil, ay, gun) {
    const listeAlani = document.getElementById("gelmeyenlerSirketListesi");
    if(!listeAlani) return;
    listeAlani.innerHTML = "";

    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const gunAdlari = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    
    const tarihObj = new Date(yil, ay - 1, gun);
    document.getElementById("gelmeyenlerModalTarih").innerText = `${gun} ${ayAdlari[ay - 1]} ${yil}, ${gunAdlari[tarihObj.getDay()]}`;

    const donemKey = yil + "_" + String(ay).padStart(2, '0');
    let sayac = 0;

    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;

        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        const durum = pDonemi[gun] ? pDonemi[gun].durum : "BOS";

        if (durum !== "GELDI" && durum !== "BOS") {
            sayac++;
            let badgeStyle = "";
            if (durum === "GELMEDI") badgeStyle = "background:#fee2e2; color:#ef4444; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;";
            else if (durum === "H_IZIN") badgeStyle = "background:#fef08a; color:#a16207; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;";
            else if (durum === "Y_IZIN") badgeStyle = "background:#dbeafe; color:#2563eb; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;";
            else if (durum === "C_IZIN") badgeStyle = "background:#f1f5f9; color:#0f172a; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;";
            else if (durum === "RAPOR") badgeStyle = "background:#f3e8ff; color:#7e22ce; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:700;";

            const labels = {"GELMEDI":"GELMEDİ", "H_IZIN":"HAFTALIK İZİN", "Y_IZIN":"YILLIK İZİN", "C_IZIN":"CENAZE İZNİ", "RAPOR":"SAĞLIK RAPORU"};

            listeAlani.innerHTML += `
                <div class="mesai-detay-item">
                    <div class="detay-tarih">
                        <strong>${p.adSoyad}</strong>
                        <span style="font-size:11px; color:#64748b; display:block;">${p.departman}</span>
                    </div>
                    <div class="detay-saatler">
                        <span style="${badgeStyle}">${labels[durum]}</span>
                    </div>
                </div>
            `;
        }
    });

    if (sayac === 0) listeAlani.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px 0;">Bu tarihte eksik/izinli personel bulunmuyor şefim!</p>`;
}

function GelmeyenSayisiniGuncelle() {
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    let gelmeyenSayisi = 0;
    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;
        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};
        if ((pDonemi[mobilSeciliGun] ? pDonemi[mobilSeciliGun].durum : "BOS") === "GELMEDI") gelmeyenSayisi++;
    });
    document.getElementById("gelmeyenButonMetni").innerText = `Gelmeyenler (${gelmeyenSayisi})`;
}

// =========================================================================
// 6. PERSONEL ARAMA, SEÇME VE YÖNETİM MOTORLARI
// =========================================================================
function aramaYap() {
    const aramaMetni = document.getElementById("panelAramaKutusu").value.toLowerCase().trim();
    const satirlar = document.querySelectorAll("#tabloGövdeSatirlari tr");
    satirlar.forEach(satir => {
        const isimHucresi = satir.querySelector(".sticky-col strong");
        if (isimHucresi) {
            satir.style.display = isimHucresi.innerText.toLowerCase().includes(aramaMetni) ? "" : "none";
        }
    });
}

function aramaYapMobil() {
    const aramaMetni = document.getElementById("mobilAramaKutusu").value.toLowerCase().trim();
    const kartlar = document.querySelectorAll("#mobilKartKapsayici .mobile-personnel-card");
    kartlar.forEach(kart => {
        const isimHucresi = kart.querySelector(".mobile-card-info strong");
        if (isimHucresi) {
            kart.style.display = isimHucresi.innerText.toLowerCase().includes(aramaMetni) ? "" : "none";
        }
    });
}

function filtreleDepartman(deptName, butonElement) {
    secilenDepartman = deptName;
    const butonlar = document.querySelectorAll("#departmanFiltreGrubu .btn-filter");
    butonlar.forEach(btn => btn.classList.remove("active"));
    if (butonElement) butonElement.classList.add("active");
    TabloGövdesiniDoldur();
    MobilKartlariniDoldur();
    GelmeyenSayisiniGuncelle();
}

function personelEkle() {
    const id = document.getElementById("editPersonelId").value;
    const adSoyad = document.getElementById("perAdSoyad").value.trim();
    const departman = document.getElementById("perGrup").value;

    if (!adSoyad) { alert("Lütfen Personel Adı Soyadı alanını doldurunuz."); return; }

    if (id) {
        db.ref("personeller/" + id).update({ adSoyad, departman })
        .then(() => {
            document.getElementById("editPersonelId").value = "";
            document.getElementById("perAdSoyad").value = "";
            document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-plus"></i> Yeni Personel Tanımla`;
        });
    } else {
        const yeniRef = db.ref("personeller").push();
        yeniRef.set({ adSoyad, departman, puantaj: {} })
        .then(() => { document.getElementById("perAdSoyad").value = ""; });
    }
}

function personelDuzenleHazirlik(id) {
    const p = tumKullanicilar[id];
    document.getElementById("editPersonelId").value = id;
    document.getElementById("perAdSoyad").value = p.adSoyad;
    document.getElementById("perGrup").value = p.departman;
    document.getElementById("btnPersonelSubmit").innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Değişiklikleri Güncelle`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function personelSil(id) {
    if(confirm("Bu personeli ve tüm puantaj geçmişini silmek istediğinize emin misiniz?")) {
        db.ref("personeller/" + id).remove();
    }
}

// =========================================================================
// 7. HÜCRE MODAL DÜZENLEME VE DETAY GEÇMİŞ MOTORLARI
// =========================================================================
function durumSecimPenceresi(perId, gunNo) {
    const p = tumKullanicilar[perId];
    document.getElementById("modalPersonelId").value = perId;
    document.getElementById("modalGunNo").value = gunNo;
    document.getElementById("modalBaslik").innerText = p.adSoyad + " - " + gunNo + ". Gün";
    
    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("modalTarihBilgi").innerText = gunNo + " " + ayAdlari[aktifAy - 1] + " " + aktifYil;

    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const kayit = p.puantaj && p.puantaj[donemKey] && p.puantaj[donemKey][gunNo] ? p.puantaj[donemKey][gunNo] : {};
    
    document.getElementById("modalDurum").value = kayit.durum || "BOS";
    document.getElementById("modalNormalMesai").value = kayit.normalMesai !== undefined ? kayit.normalMesai : 9;
    document.getElementById("modalFazlaMesai").value = kayit.fazlaMesai !== undefined ? kayit.fazlaMesai : 0;

    modalDurumSenaryoKontrol(kayit.durum || "BOS");
    document.getElementById("chefModal").style.display = "block";
}

function modalDurumSenaryoKontrol(durumKodu) {
    const displayStyle = (durumKodu === "GELDI") ? "block" : "none";
    document.getElementById("normalMesaiAlani").style.display = displayStyle;
    document.getElementById("fazlaMesaiAlani").style.display = displayStyle;
}

function gunlukVeriKaydet() {
    const perId = document.getElementById("modalPersonelId").value;
    const gunNo = document.getElementById("modalGunNo").value;
    const durum = document.getElementById("modalDurum").value;
    const nMesai = parseFloat(document.getElementById("modalNormalMesai").value) || 0;
    const fMesai = parseFloat(document.getElementById("modalFazlaMesai").value) || 0;
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    
    const veri = { durum: durum, normalMesai: durum === "GELDI" ? nMesai : 0, fazlaMesai: durum === "GELDI" ? fMesai : 0 };

    db.ref("personeller/" + perId + "/puantaj/" + donemKey + "/" + gunNo).set(veri).then(() => { modalKapat(); });
}

function mesaiDetayModaliAc(perId) {
    const p = tumKullanicilar[perId];
    document.getElementById("detayModalPersonelAdi").innerText = p.adSoyad;
    const ayAdlari = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    document.getElementById("detayModalDonemYazi").innerText = ayAdlari[aktifAy - 1] + " " + aktifYil + " Mesai Raporu";

    const listeAlani = document.getElementById("mesaiDetayListesi");
    listeAlani.innerHTML = "";
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};

    let toplamCalisma = 0, toplamFazla = 0, mesaiVarMi = false, satirHtml = "";
    for (let i = 1; i <= toplamGunSayisi; i++) {
        const kayit = pDonemi[i] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
        if (kayit.durum !== "GELDI" || (parseInt(kayit.normalMesai) === 0 && parseInt(kayit.fazlaMesai) === 0)) continue;

        mesaiVarMi = true;
        toplamCalisma += kayit.normalMesai;
        toplamFazla += kayit.fazlaMesai;
        satirHtml += `
            <div class="mesai-detay-item">
                <div class="detay-tarih"><strong>${i.toString().padStart(2,'0')}.${String(aktifAy).padStart(2,'0')}.${aktifYil}</strong></div>
                <div class="detay-saatler"><span class="normal-saat-yazi">${kayit.normalMesai} Sa</span><span class="fazla-saat-yazi">+${kayit.fazlaMesai} Sa</span></div>
            </div>`;
    }

    if (!mesaiVarMi) {
        listeAlani.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px 0;">Bu aya ait çalışma kaydı bulunamadı.</p>`;
    } else {
        listeAlani.innerHTML = `
        <div style="background:#f8fafc; padding:12px; border-radius:12px; margin-bottom:14px; display:flex; justify-content:space-between; border:1px solid #e2e8f0;">
            <div><span style="font-size:11px; color:#64748b; display:block;">Normal Mesai</span><strong style="color:#1e293b; font-size:15px;">${toplamCalisma} Sa</strong></div>
            <div><span style="font-size:11px; color:#64748b; display:block;">Toplam FM</span><strong style="color:#16a34a; font-size:15px;">+${toplamFazla} Sa</strong></div>
        </div>` + satirHtml;
    }
    document.getElementById("mesaiDetayModal").style.display = "block";
}

// =========================================================================
// 8. EXCEL RAPORLAMA VE SAAT MOTORLARI
// =========================================================================
function excelAktar() {
    if (Object.keys(tumKullanicilar).length === 0) { alert("Rapora aktarılacak personel verisi bulunamadı!"); return; }
    const donemKey = aktifYil + "_" + String(aktifAy).padStart(2, '0');
    const ayAdlari = ["Ocak", "Subat", "Mart", "Nisan", "Mayis", "Haziran", "Temmuz", "Agustos", "Eylul", "Ekim", "Kasim", "Aralik"];
    
    let basliklar = ["Personel Adı Soyadı", "Departman / Görev"];
    for (let i = 1; i <= toplamGunSayisi; i++) { basliklar.push(i + "." + ayAdlari[aktifAy-1].substring(0,3)); }
    basliklar.push("Toplam Normal Saati", "Toplam Fazla Mesai Saati");

    let excelData = [basliklar];
    Object.keys(tumKullanicilar).forEach(perId => {
        const p = tumKullanicilar[perId];
        if (secilenDepartman !== "HEPSİ" && p.departman !== secilenDepartman) return;
        let satir = [p.adSoyad, p.departman];
        let nToplam = 0, fToplam = 0;
        const pDonemi = p.puantaj && p.puantaj[donemKey] ? p.puantaj[donemKey] : {};

        for (let g = 1; g <= toplamGunSayisi; g++) {
            const kayit = pDonemi[g] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
            if (kayit.durum === "GELDI") {
                satir.push(`G (${kayit.normalMesai}${kayit.fazlaMesai > 0 ? '+' + kayit.fazlaMesai : ''})`);
                nToplam += kayit.normalMesai; fToplam += kayit.fazlaMesai;
            } else if (kayit.durum === "BOS") satir.push("-");
            else satir.push(kayit.durum);
        }
        satir.push(nToplam, fToplam); excelData.push(satir);
    });

    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Puantaj Raporu");
    XLSX.writeFile(wb, `ED_Yazilim_Puantaj_Raporu_${donemKey}.xlsx`);
}

function SaatVeTarihMotoru() {
    const aylar = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
    const gunler = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
    setInterval(() => {
        const zaman = new Date();
        if(document.getElementById("live-time")) {
            document.getElementById("live-time").innerText = zaman.toTimeString().split(" ")[0];
            document.getElementById("live-date-day").innerText = String(zaman.getDate()).padStart(2, '0');
            document.getElementById("live-date-month").innerText = aylar[zaman.getMonth()];
            document.getElementById("live-date-year").innerText = zaman.getFullYear() + ", " + gunler[zaman.getDay()];
        }
    }, 1000);
}

function modalKapat() { document.getElementById("chefModal").style.display = "none"; }
function gelmeyenlerModalKapat() { document.getElementById("gelmeyenlerModal").style.display = "none"; }
function mesaiDetayModalKapat() { document.getElementById("mesaiDetayModal").style.display = "none"; }
