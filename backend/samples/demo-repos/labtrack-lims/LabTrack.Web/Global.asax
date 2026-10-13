<%@ Application Language="C#" %>
<script runat="server">
    void Application_Start(object sender, EventArgs e)
    {
        log4net.Config.XmlConfigurator.Configure();
    }

    void Session_Start(object sender, EventArgs e)
    {
        Session["SiteCode"] = "IE01";
    }
</script>
