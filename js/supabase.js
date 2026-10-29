// Supabase data access for public reports and authenticated admin actions
(function () {
  const D = window.DW;
  const { createClient } = window.supabase;
  D.client = createClient(D.SUPABASE_URL, D.SUPABASE_PUBLISHABLE_KEY);
  const client = D.client;

  const photoUrl = path => path ? client.storage.from("report-photos").getPublicUrl(path).data.publicUrl : "";
  const fromRow = row => ({
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    desc: row.description,
    sev: row.severity,
    danger: row.danger,
    photo: photoUrl(row.photo_path),
    photoPath: row.photo_path,
    status: row.status,
    seen: row.seen,
    log: row.log || []
  });
  D.reportFromRow = fromRow;

  D.loadReports = async () => {
    const { data, error } = await client.from("reports").select("*").order("created_at");
    if (error) throw error;
    return data.map(fromRow);
  };

  D.watchReports = onChange => client.channel("drainwatch-reports")
    .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, onChange)
    .subscribe(status => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(`Supabase report updates subscription status: ${status}`);
        D.toast("Live report updates are unavailable. Refresh the page to check for new reports.");
      }
    });

  D.refreshAdmin = async () => {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      D.isAdmin = false;
      return false;
    }
    const { data, error } = await client.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
    if (error) throw error;
    D.isAdmin = Boolean(data);
    return D.isAdmin;
  };

  D.signInAdmin = async (email, password) => {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await D.refreshAdmin();
    if (!D.isAdmin) {
      await client.auth.signOut();
      throw new Error("This account is not authorized as a DrainWatch admin.");
    }
  };

  D.signOutAdmin = async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    D.isAdmin = false;
  };

  D.submitReport = async (report, file) => {
    let photoPath = null;
    if (file) {
      const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
      const extension = extensions[file.type];
      if (!extension || file.size > 5 * 1024 * 1024) throw new Error("Choose a supported image no larger than 5 MB.");
      photoPath = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await client.storage.from("report-photos").upload(photoPath, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
    }

    const { data, error } = await client.from("reports").insert({
      lat: report.lat,
      lng: report.lng,
      description: report.desc,
      severity: report.sev,
      danger: report.danger,
      photo_path: photoPath,
      status: "Reported",
      seen: 1,
      log: [["Reported", report.reportedOn]]
    }).select("*").single();

    if (error) {
      if (photoPath) {
        const { error: cleanupError } = await client.storage.from("report-photos").remove([photoPath]);
        if (cleanupError) console.error("Unable to remove an uploaded photo after a failed report submission:", cleanupError);
      }
      throw error;
    }
    return fromRow(data);
  };

  D.incrementSeen = async id => {
    const { data, error } = await client.rpc("increment_report_seen", { report_id: id });
    if (error) throw error;
    return data;
  };

  D.updateReportStatus = async (report, status, log) => {
    const { data, error } = await client.from("reports").update({ status, log }).eq("id", report.id).select("*").single();
    if (error) throw error;
    return fromRow(data);
  };

  D.deleteReport = async report => {
    const { error } = await client.from("reports").delete().eq("id", report.id);
    if (error) throw error;
    if (report.photoPath) {
      const { error: photoError } = await client.storage.from("report-photos").remove([report.photoPath]);
      if (photoError) throw new Error(`Report deleted, but its photo could not be removed: ${photoError.message}`);
    }
  };

  D.clearReports = async reports => {
    const paths = reports.map(report => report.photoPath).filter(Boolean);
    const { error } = await client.from("reports").delete().not("id", "is", null);
    if (error) throw error;
    if (paths.length) {
      const { error: photoError } = await client.storage.from("report-photos").remove(paths);
      if (photoError) throw new Error(`Reports deleted, but some photos could not be removed: ${photoError.message}`);
    }
  };
})();
