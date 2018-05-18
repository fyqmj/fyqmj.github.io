"use strict";
//土豆类型
var Potato = function(text) {
    if (text) {
        var o = JSON.parse(text);
        this.owner = o.owner;//土豆所有人
        this.price = new BigNumber(o.price);//土豆价格
      } else {
        this.owner = "";
        this.price = new BigNumber(0);
      }
};

Potato.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};

//游戏信息
var GameInfo=function(text){
    if (text) {
        var o = JSON.parse(text);

        this.ceoAddress=o.ceoAddress;
        this.hotPotatoHolder=o.hotPotatoHolder;
        this.lastHotPotatoHolder=o.lastHotPotatoHolder;
        this.lastBidTime=o.lastBidTime;
        this.contestStartTime=o.contestStartTime;
        this.lastPot=new BigNumber(o.lastPot);
        this.sedimentaryBalance=new BigNumber(o.sedimentaryBalance);
      } else {
        this.ceoAddress="";
        this.hotPotatoHolder="";
        this.lastHotPotatoHolder="";
        this.lastBidTime="";
        this.contestStartTime="";
        this.lastPot=new BigNumber(0);
        this.sedimentaryBalance=new BigNumber(0);
      }
}

GameInfo.prototype = {
	toString: function () {
		return JSON.stringify(this);
	}
};


//
var SafeMath = function() {
};

SafeMath.prototype = {
	mul: function (a,b) {
        if (a == 0) {
            return 0;
          }
          var c = a * b;
          //assert(c / a == b);
          return c;
    },
    div: function (a,b) {
        if (a == 0) {
            return 0;
          }
          
          var c = a / b;
          return c;
    },
    sub: function (a,b) {
        //assert(b <= a);
          var c = a - b;
          return c;
	},
    add: function (a,b) {
        var c = a + b;
        //assert(c >= a);
        return c;
	}
};




var PotPotato = function () {
    LocalContractStorage.defineProperty(this, "ceoAddress"); //管理员账户地址
    LocalContractStorage.defineProperty(this, "gameInfo",{
        parse: function (text) {
            return new GameInfo(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    }); //游戏信息
    LocalContractStorage.defineProperty(this, "hotPotatoHolder"); //
    LocalContractStorage.defineProperty(this, "lastHotPotatoHolder"); //最后拥有人
    LocalContractStorage.defineProperty(this, "lastBidTime"); //最后拥有时间
    LocalContractStorage.defineProperty(this, "contestStartTime"); //游戏开始时间
    LocalContractStorage.defineProperty(this, "lastPot"); //
    LocalContractStorage.defineProperty(this, "sedimentaryBalance"); //游戏沉积价值

    LocalContractStorage.defineMapProperty(this, "potatoes",{
        parse: function (text) {
            return new Potato(text);
        },
        stringify: function (o) {
            return o.toString();
        }
    });
    LocalContractStorage.defineProperty(this, "size");


    LocalContractStorage.defineProperty(this, "BASE_TIME_TO_COOK");//30 minutes;//60 seconds;
    LocalContractStorage.defineProperty(this, "TIME_MULTIPLIER");////5 seconds;//time per index of potato
    LocalContractStorage.defineProperty(this, "TIME_TO_COOK");//BASE_TIME_TO_COOK; //this changes
    LocalContractStorage.defineProperty(this, "NUM_POTATOES"); //12;
    LocalContractStorage.defineProperty(this, "START_PRICE");//0.001 NAS;
    LocalContractStorage.defineProperty(this, "CONTEST_INTERVAL"); ////4 minutes;//1 week




};

PotPotato.prototype = {
    init: function () {
        //常量定义
        this.BASE_TIME_TO_COOK=1800;//基本煮土豆时间，30分钟
        this.TIME_MULTIPLIER=5;
        this.TIME_TO_COOK=1800;//煮土豆时间 30分钟
        this.NUM_POTATOES=12;//图片数量
        this.START_PRICE=1000000000000000;//初始价格，相当于0.001NAS
        this.CONTEST_INTERVAL=4;

        //变量设置
        //初始数据长度为0
        this.size = 0;

        this.gameInfo=new GameInfo();
    
        this.sedimentaryBalance=new BigNumber(0);//初始锅内余额为0


        this.ceoAddress=Blockchain.transaction.from;
        this.hotPotatoHolder=0;
        this.contestStartTime=1520799754;//sunday march 11
        for(var i = 0; i<this.NUM_POTATOES; i++){
            var newpotato=new Potato();
            newpotato.owner="";
            newpotato.price=this.START_PRICE;
            this.potatoes.put(this.size, newpotato);
            this.size+=1;
        }

        LocalContractStorage.set("gameInfo", this.gameInfo);
    },
    getSafeMath:function(){
        var safeMath=new SafeMath();
        return safeMath;
    },
    //购买土豆
    buyPotato: function (index) {
        //判断时间
        //require(Blockchain.transaction.timestamp>contestStartTime);

        var from = Blockchain.transaction.from;
        var value = Blockchain.transaction.value;

        var safeMath=this.getSafeMath();
        //var amount = new BigNumber(value);
        //输入测试信息
        //return "Size:"+this.size+"  Index:"+index+" "+" value："+value+" BigNumber:"+amount;

        if(this._endContestIfNeeded()){ 
            
        }else{
            var tempPotato=this.potatoes.get(index);
            //return tempPotato;
            //判断价格
            if (value.lt(tempPotato.price)) {
                throw new Error("价格低于现有价格，购买失败！");
              }
            //require(msg.value >= potato.price);
            //判断所有者
            if (from == tempPotato.owner) {
                throw new Error("你已购买，不可重新购买，购买失败！");
              }
           // require(msg.sender != potato.owner);
            //判断是否管理员
            if (from == this.ceoAddress) {
                throw new Error("你是管理员，无法购买，购买失败！");
              }
            //require(msg.sender != ceoAddress);

            //土豆价格
            var sellingPrice=tempPotato.price;
            //付款与价格之间的差值
            var purchaseExcess = safeMath.sub(value, sellingPrice);
            //土豆价格的 76%，用于支付给土豆所有人
            var payment =new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 76), 100));
            //土豆价格的 4% 用于支付给开发人员
            var devFee=new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 4), 100));

            //土豆价格的 20% 用于沉积在奖池
            var devFee1=new BigNumber(safeMath.div(safeMath.mul(sellingPrice, 20), 100));
            
            //this.sedimentaryBalance=safeMath.add(this.sedimentaryBalance,devFee1);
            
            this.sedimentaryBalance =devFee1.plus(new BigNumber(this.sedimentaryBalance));
            //throw new Error(" sellingPrice:"+sellingPrice +" purchaseExcess:"+purchaseExcess +" payment:"+payment +"devFee:"+this.sedimentaryBalance +"  tempPotato.owner:");
            //20 percent remaining in the contract goes to the pot
            //if the owner is the contract, this is the first purchase, and payment should go to the pot
            if(tempPotato.owner!=from){
                //判断是不是第一个道具所有者
                if(tempPotato.owner==""){
                    //存入奖池
                    //this.sedimentaryBalance.plus(payment);
                    //this.sedimentaryBalance=safeMath.add(this.sedimentaryBalance,payment);
                    this.sedimentaryBalance =payment.plus(new BigNumber(this.sedimentaryBalance));
                    //throw new Error("提取失败，请稍后重试."+this.sedimentaryBalance);
                }else{
                    //向土豆所有者转帐
                    //potato.owner.transfer(payment);
                    var result = Blockchain.transfer(tempPotato.owner, payment);
                    if (!result) {
                        throw new Error("提取失败，请稍后重试.");
                    }
                }

            }
            //向管理员转账
            //ceoAddress.transfer(devFee);
            Blockchain.transfer(this.ceoAddress, devFee);
            //新土豆的价格为 原价格*150 /76,如果有人购买，则你挣了 50%
            var tempPrice=new BigNumber(safeMath.mul(sellingPrice, 150));

            tempPotato.price= tempPrice.divToInt(76);
            tempPotato.owner=from;//修改土豆所有人
            this.potatoes.put(index, tempPotato);
            this.hotPotatoHolder=from;//修改土豆锅最后拥有者
            this.lastBidTime=Blockchain.transaction.timestamp;//修改最后操作时间
            this.TIME_TO_COOK=safeMath.add(this.BASE_TIME_TO_COOK,safeMath.mul(index,this.TIME_MULTIPLIER)); //根据12种不同的道具，修改做饭时间从30 - 85分钟
            //msg.sender.transfer(purchaseExcess);//returns excess eth
            //返回多余的NAS给用户,避免人为恶意提高价格
            Blockchain.transfer(from, purchaseExcess);
            return "购买成功！";
        }
    },
    getPotato: function (index) {
        return this.potatoes.get(index);;
    },
    getBalance: function () {
        return this.sedimentaryBalance;
    },
    //计算当前时间点与最后游戏时间点之间的差值
    timePassed:function(){
        
        if(this.lastBidTime==0){
            return 0;
        }
        
        return this.getSafeMath().sub(Blockchain.transaction.timestamp,this.lastBidTime);
    },
    getHotPotatoHolder:function(){
        return this.hotPotatoHolder;
    },
    getLastHotPotatoHolder:function(){
        return this.lastHotPotatoHolder;
    },
    //下次游戏开始时间
    timeLeftToContestStart:function(){
        if(Blockchain.transaction.timestamp>this.contestStartTime){
            return 0;
        }
        return this.getSafeMath().sub(this.contestStartTime,Blockchain.transaction.timestamp);
    },
    timeLeftToCook:function(){
        return this.getSafeMath().sub(this.TIME_TO_COOK,this.timePassed());
    },
    contestOver:function(){
        return this.timePassed()>=this.TIME_TO_COOK;
    },
    _endContestIfNeeded:function(){
        //return false;
        if(this.timePassed()>=this.TIME_TO_COOK && this.hotPotatoHolder!=""){
            var from = Blockchain.transaction.from;
            var value = Blockchain.transaction.value;
            //最后一个调用
            //msg.sender.transfer(msg.value);
            //将支付返回给调用者
            Blockchain.transfer(from, value);
            this.lastPot=this.sedimentaryBalance;
            this.lastHotPotatoHolder=this.hotPotatoHolder;
            //向最后个一个所有者转账
            //hotPotatoHolder.transfer(this.balance);
            Blockchain.transfer(this.hotPotatoHolder, this.sedimentaryBalance);
            this.hotPotatoHolder=0;
            this.lastBidTime=0;
            _resetPotatoes();
            _setNewStartTime();
            return true;
        }
        return false;
    },
    _resetPotatoes:function(){
        var from = Blockchain.transaction.from;
        for(var i = 0; i<this.NUM_POTATOES; i++){
            var newpotato=new Potato();
            newpotato.owner=from;
            newpotato.price=this.START_PRICE;
            this.potatoes.put(i,newpotato);
        }
    },
    _resetPotatoes:function(){
        var start=this.contestStartTime;
        while(start<Blockchain.transaction.timestamp){
            start=SafeMath.add(start,CONTEST_INTERVAL);
        }
        contestStartTime=start;
    }
};
module.exports = PotPotato;