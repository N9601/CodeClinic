<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="SampleEntry.aspx.cs" Inherits="LabTrack.Web.SampleEntry" %>
<!DOCTYPE html>
<html>
<head runat="server">
    <title>LabTrack - Result Entry</title>
    <script src="Scripts/jquery-1.8.3.min.js"></script>
    <script src="Scripts/jquery-ui-1.9.2.min.js"></script>
</head>
<body>
    <form id="form1" runat="server">
        <asp:Label ID="lblSample" runat="server" />
        <asp:TextBox ID="txtResult" runat="server" />
        <asp:TextBox ID="txtSignaturePassword" runat="server" TextMode="Password" />
        <asp:Button ID="btnApprove" runat="server" Text="Approve result (e-signature)" OnClick="btnApprove_Click" />
    </form>
</body>
</html>
